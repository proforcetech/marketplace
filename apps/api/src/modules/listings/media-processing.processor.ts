import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Processes media uploads for listings (image resizing, thumbnail generation, EXIF stripping,
 * perceptual hash computation).
 *
 * Job queue: 'media-processing'
 * Job types: 'process-image', 'process-video'
 */

interface ProcessImageJobData {
  listingId: string;
  mediaId: string;
  s3Key: string;
}

interface ProcessVideoJobData {
  listingId: string;
  mediaId: string;
  s3Key: string;
}

/**
 * Compute a dHash (difference hash) for an image buffer.
 * Resizes to 9x8 greyscale, compares adjacent pixels horizontally,
 * returns a 16-character hex string (64-bit hash).
 */
async function computeDHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .resize(9, 8, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col] ?? 0;
      const right = data[row * 9 + col + 1] ?? 0;
      if (left > right) {
        hash |= 1n << BigInt(row * 8 + col);
      }
    }
  }
  return hash.toString(16).padStart(16, '0');
}

function createS3Client(): S3Client {
  return new S3Client({
    region: process.env['S3_REGION'] ?? 'us-east-1',
    endpoint: process.env['S3_ENDPOINT'],
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env['S3_ACCESS_KEY'] ?? '',
      secretAccessKey: process.env['S3_SECRET_KEY'] ?? '',
    },
  });
}

async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const s3 = createS3Client();
  const bucket = process.env['S3_BUCKET'] ?? 'marketplace';

  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
  );

  if (!response.Body) {
    throw new Error(`Empty S3 response body for key: ${s3Key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate() // auto-rotate based on EXIF orientation, strips EXIF
    .resize(400, 400, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function processMainImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate() // strips EXIF, corrects orientation
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const s3 = createS3Client();
  const bucket = process.env['S3_BUCKET'] ?? 'marketplace';
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

function buildPublicUrl(key: string): string {
  const base = process.env['S3_PUBLIC_URL'] ?? '';
  return `${base}/${key}`;
}

async function extractVideoThumbnail(videoBuffer: Buffer): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const videoPath = path.join(tmpDir, `vid-${Date.now()}.mp4`);
  const thumbPath = path.join(tmpDir, `thumb-${Date.now()}.jpg`);

  await fs.promises.writeFile(videoPath, videoBuffer);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbPath),
        folder: path.dirname(thumbPath),
        size: '640x?',
      })
      .on('end', () => resolve())
      .on('error', reject);
  });

  const thumbBuffer = await fs.promises.readFile(thumbPath);

  // Clean up temp files
  await Promise.allSettled([
    fs.promises.unlink(videoPath),
    fs.promises.unlink(thumbPath),
  ]);

  return thumbBuffer;
}

@Processor('media-processing')
export class MediaProcessingProcessor {
  private readonly logger = new Logger(MediaProcessingProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process('process-image')
  async handleProcessImage(job: Job<ProcessImageJobData>): Promise<void> {
    const { listingId, mediaId, s3Key } = job.data;
    this.logger.log(`Processing image: mediaId=${mediaId}, listingId=${listingId}`);

    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: { processingStatus: 'PROCESSING' },
    });

    try {
      const imageBuffer = await downloadFromS3(s3Key);

      // Compute perceptual hash for duplicate/blocklist detection
      const hash = await computeDHash(imageBuffer);
      this.logger.log(`dHash computed: mediaId=${mediaId}, hash=${hash}`);

      // Generate thumbnail
      const thumbnailBuffer = await generateThumbnail(imageBuffer);
      const thumbnailKey = s3Key.replace(/(\.[^.]+)?$/, '-thumb.jpg');
      await uploadToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg');

      // Process main image (strip EXIF, resize)
      const processedBuffer = await processMainImage(imageBuffer);
      const processedKey = s3Key.replace(/(\.[^.]+)?$/, '-processed.jpg');
      await uploadToS3(processedKey, processedBuffer, 'image/jpeg');

      await this.prisma.listingMedia.update({
        where: { id: mediaId },
        data: {
          processingStatus: 'PROCESSED',
          hash,
          thumbnailUrl: buildPublicUrl(thumbnailKey),
          url: buildPublicUrl(processedKey),
        },
      });

      this.logger.log(`Image processed successfully: mediaId=${mediaId}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process image: mediaId=${mediaId}, error=${errMsg}`);

      try {
        await this.prisma.listingMedia.update({
          where: { id: mediaId },
          data: { processingStatus: 'FAILED' },
        });
      } catch (dbError: unknown) {
        const dbErrMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
        this.logger.error(`Failed to update media status: mediaId=${mediaId}, error=${dbErrMsg}`);
      }

      throw error;
    }
  }

  @Process('process-video')
  async handleProcessVideo(job: Job<ProcessVideoJobData>): Promise<void> {
    const { listingId, mediaId, s3Key } = job.data;
    this.logger.log(`Processing video: mediaId=${mediaId}, listingId=${listingId}, s3Key=${s3Key}`);

    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: { processingStatus: 'PROCESSING' },
    });

    try {
      const videoBuffer = await downloadFromS3(s3Key);

      // Extract thumbnail from first keyframe
      const thumbnailBuffer = await extractVideoThumbnail(videoBuffer);
      const thumbnailKey = s3Key.replace(/(\.[^.]+)?$/, '-thumb.jpg');
      await uploadToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg');

      await this.prisma.listingMedia.update({
        where: { id: mediaId },
        data: {
          processingStatus: 'PROCESSED',
          thumbnailUrl: buildPublicUrl(thumbnailKey),
        },
      });

      this.logger.log(`Video processed successfully: mediaId=${mediaId}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process video: mediaId=${mediaId}, error=${errMsg}`);

      try {
        await this.prisma.listingMedia.update({
          where: { id: mediaId },
          data: { processingStatus: 'FAILED' },
        });
      } catch (dbError: unknown) {
        const dbErrMsg = dbError instanceof Error ? dbError.message : 'Unknown error';
        this.logger.error(`Failed to update video status: mediaId=${mediaId}, error=${dbErrMsg}`);
      }

      throw error;
    }
  }
}

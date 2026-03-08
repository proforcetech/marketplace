import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageService as IStorageService } from '../listings/listings.service';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env['S3_BUCKET'] ?? 'marketplace-media';
    this.publicUrl = process.env['CDN_URL'] ?? `${process.env['S3_ENDPOINT'] ?? 'http://localhost:9000'}/${this.bucket}`;

    this.s3 = new S3Client({
      region: process.env['S3_REGION'] ?? 'us-east-1',
      endpoint: process.env['S3_ENDPOINT'],
      forcePathStyle: process.env['S3_USE_PATH_STYLE'] === 'true',
      credentials: {
        accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
      },
    });
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    maxSizeBytes: number,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    this.logger.debug(`Generating presigned upload URL for key=${key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: maxSizeBytes,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadUrl = await getSignedUrl(this.s3 as any, command as any, { expiresIn: 300 });

    return { uploadUrl, fileKey: key };
  }

  async deleteObject(key: string): Promise<void> {
    this.logger.debug(`Deleting S3 object key=${key}`);
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

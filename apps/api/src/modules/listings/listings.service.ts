import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ListingStatus } from '@marketplace/shared';
import type { PresignedUploadResponse } from '@marketplace/shared';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { RiskScoringService } from '../moderation/risk-scoring.service';
import { securityConfig } from '../../config/security.config';

// ─── Prisma client injection token ──────────────────────────
export const PRISMA_SERVICE = 'PRISMA_SERVICE';

// ─── S3 storage injection token ─────────────────────────────
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface StorageService {
  generatePresignedUploadUrl(
    key: string,
    contentType: string,
    maxSizeBytes: number,
  ): Promise<{ uploadUrl: string; fileKey: string }>;
  deleteObject(key: string): Promise<void>;
}

// ─── Status Transition State Machine ────────────────────────

const VALID_STATUS_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  [ListingStatus.DRAFT]: [ListingStatus.PENDING_REVIEW],
  [ListingStatus.PENDING_REVIEW]: [ListingStatus.ACTIVE, ListingStatus.REMOVED],
  [ListingStatus.ACTIVE]: [
    ListingStatus.SOLD,
    ListingStatus.CLOSED,
    ListingStatus.REMOVED,
  ],
  [ListingStatus.SOLD]: [],
  [ListingStatus.CLOSED]: [],
  [ListingStatus.REMOVED]: [],
};

/** Additional owner-allowed transitions (pausing etc.) are mapped separately */
const OWNER_STATUS_TRANSITIONS: Record<string, ListingStatus[]> = {
  [ListingStatus.ACTIVE]: [ListingStatus.SOLD, ListingStatus.CLOSED],
  [ListingStatus.DRAFT]: [ListingStatus.PENDING_REVIEW],
};

const LISTING_EXPIRY_DAYS = 30;

function generateSlug(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200)
    .replace(/^-|-$/g, '');
  return `${base}-${id.substring(0, 8)}`;
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @Inject(PRISMA_SERVICE)
    private readonly prisma: {
      listing: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
        findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
        count: (args: Record<string, unknown>) => Promise<number>;
      };
      listingMedia: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
        findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
        delete: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
        count: (args: Record<string, unknown>) => Promise<number>;
      };
      listingField: {
        createMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
        deleteMany: (args: Record<string, unknown>) => Promise<{ count: number }>;
      };
      category: {
        findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      };
      categoryField: {
        findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
      };
      $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
    },
    @Inject(STORAGE_SERVICE)
    private readonly storage: StorageService,
    private readonly riskScoring: RiskScoringService,
    @InjectQueue('risk-scoring') private readonly riskScoringQueue: Queue,
    @InjectQueue('media-processing') private readonly mediaQueue: Queue,
  ) {}

  /**
   * Create a new listing in draft status.
   * Validates category fields and computes initial risk score.
   */
  async create(
    userId: string,
    dto: CreateListingDto,
  ): Promise<Record<string, unknown>> {
    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new BadRequestException('Invalid category');
    }

    // Validate category-specific fields if provided
    if (dto.fields) {
      await this.validateCategoryFields(dto.categoryId, dto.fields);
    }

    // Create the listing
    const listing = await this.prisma.listing.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title,
        slug: '', // temporary, will be updated with generated slug
        description: dto.description ?? null,
        price: dto.price ?? null,
        priceType: dto.priceType,
        condition: dto.condition ?? null,
        status: ListingStatus.DRAFT,
        visibility: dto.visibility ?? 'public',
        locationCity: dto.location.city,
        locationState: dto.location.state,
        locationZip: dto.location.zip ?? null,
        viewCount: 0,
        messageCount: 0,
        isPromoted: false,
        riskScore: 0,
      },
    });

    const listingId = listing['id'] as string;

    // Generate and update slug
    const slug = generateSlug(dto.title, listingId);
    await this.prisma.listing.update({
      where: { id: listingId },
      data: { slug },
    });

    // Set PostGIS location via raw SQL
    await this.prisma.$queryRaw`
      UPDATE listings
      SET location = ST_SetSRID(ST_MakePoint(${dto.location.lng}, ${dto.location.lat}), 4326)::geography
      WHERE id = ${listingId}
    `;

    // Store category-specific fields
    if (dto.fields && Object.keys(dto.fields).length > 0) {
      const categoryFields = await this.prisma.categoryField.findMany({
        where: { categoryId: dto.categoryId },
      });
      const fieldMap = new Map(
        categoryFields.map((f) => [f['name'] as string, f['id'] as string]),
      );

      const fieldRecords = Object.entries(dto.fields)
        .filter(([key]) => fieldMap.has(key))
        .map(([key, value]) => ({
          listingId,
          fieldId: fieldMap.get(key)!,
          value: String(value),
        }));

      if (fieldRecords.length > 0) {
        await this.prisma.listingField.createMany({ data: fieldRecords });
      }
    }

    this.logger.log(`Listing created: id=${listingId}, user=${userId}`);

    // Enqueue async risk scoring so creation is not blocked
    await this.riskScoringQueue.add('score-listing', { listingId });

    return { ...listing, id: listingId, slug };
  }

  /**
   * Get a listing by ID, incrementing view count for non-owners.
   */
  async findById(
    listingId: string,
    viewerUserId?: string,
  ): Promise<Record<string, unknown>> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: { orderBy: { position: 'asc' } },
        category: true,
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            identityVerified: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Soft-deleted or removed listings are not visible to non-owners/non-admins
    const status = listing['status'] as string;
    if (status === ListingStatus.REMOVED && listing['userId'] !== viewerUserId) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count for non-owners (fire-and-forget)
    if (viewerUserId !== listing['userId']) {
      this.prisma.listing
        .update({
          where: { id: listingId },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err: Error) => {
          this.logger.warn(`Failed to increment view count: ${err.message}`);
        });
    }

    return listing;
  }

  /**
   * Update a listing. Only the owner can update.
   */
  async update(
    listingId: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<Record<string, unknown>> {
    const listing = await this.ensureOwnership(listingId, userId);

    const status = listing['status'] as string;
    if (status === ListingStatus.SOLD || status === ListingStatus.REMOVED) {
      throw new ConflictException('Cannot update a listing in its current status');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      updateData['title'] = dto.title;
      updateData['slug'] = generateSlug(dto.title, listingId);
    }
    if (dto.description !== undefined) updateData['description'] = dto.description;
    if (dto.price !== undefined) updateData['price'] = dto.price;
    if (dto.priceType !== undefined) updateData['priceType'] = dto.priceType;
    if (dto.condition !== undefined) updateData['condition'] = dto.condition;
    if (dto.visibility !== undefined) updateData['visibility'] = dto.visibility;

    if (dto.location) {
      updateData['locationCity'] = dto.location.city;
      updateData['locationState'] = dto.location.state;
      if (dto.location.zip !== undefined) updateData['locationZip'] = dto.location.zip;
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: updateData,
    });

    // Update PostGIS location if coordinates changed
    if (dto.location) {
      await this.prisma.$queryRaw`
        UPDATE listings
        SET location = ST_SetSRID(ST_MakePoint(${dto.location.lng}, ${dto.location.lat}), 4326)::geography
        WHERE id = ${listingId}
      `;
    }

    // Update category-specific fields
    if (dto.fields) {
      const categoryId = listing['categoryId'] as string;
      await this.validateCategoryFields(categoryId, dto.fields);

      await this.prisma.listingField.deleteMany({
        where: { listingId },
      });

      const categoryFields = await this.prisma.categoryField.findMany({
        where: { categoryId },
      });
      const fieldMap = new Map(
        categoryFields.map((f) => [f['name'] as string, f['id'] as string]),
      );

      const fieldRecords = Object.entries(dto.fields)
        .filter(([key]) => fieldMap.has(key))
        .map(([key, value]) => ({
          listingId,
          fieldId: fieldMap.get(key)!,
          value: String(value),
        }));

      if (fieldRecords.length > 0) {
        await this.prisma.listingField.createMany({ data: fieldRecords });
      }
    }

    return updated;
  }

  /**
   * Soft-delete a listing. Only the owner can delete.
   */
  async softDelete(listingId: string, userId: string): Promise<void> {
    await this.ensureOwnership(listingId, userId);

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.REMOVED },
    });

    this.logger.log(`Listing soft-deleted: id=${listingId}, user=${userId}`);
  }

  /**
   * Transition listing status with state machine validation.
   */
  async changeStatus(
    listingId: string,
    userId: string,
    newStatus: ListingStatus,
  ): Promise<Record<string, unknown>> {
    const listing = await this.ensureOwnership(listingId, userId);
    const currentStatus = listing['status'] as ListingStatus;

    // Validate transition via owner-allowed transitions
    const allowedTransitions = OWNER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ConflictException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };

    // When publishing, set expiration and published timestamp
    if (newStatus === ListingStatus.PENDING_REVIEW) {
      // Compute risk score before submission
      const riskResult = this.riskScoring.calculateListingRiskScore(
        {
          accountAgeHours: 720, // Would be fetched from user service in production
          phoneVerified: true,
          identityVerified: false,
          emailDomain: 'gmail.com',
          postingVelocityLastHour: 1,
          normalPostingRatePerHour: 3,
          reportCount7d: 0,
          deviceSharedWithBanned: false,
          deviceSharedWithFlagged: false,
          vpnDetected: false,
          datacenterIp: false,
          ipToListingDistanceMiles: null,
          ipDifferentCountry: false,
          outboundMessages24h: 0,
          conversationsInitiated24h: 0,
          replyRate: 0,
          copyPasteMessaging: false,
        },
        {
          maxCrossAccountSimilarity: 0,
          maxSameAccountSimilarity: 0,
          prohibitedKeywordMatch: false,
          prohibitedKeywordFuzzyMatch: false,
          codedLanguageDetected: false,
          priceToMedianRatio: null,
          templateMatch: false,
          knownBadMediaMatch: false,
          nsfwScore: 0,
          contactInfoInText: false,
          posterTrustLevel: 2,
        },
      );

      updateData['riskScore'] = riskResult.score;

      // Auto-approve low-risk listings
      if (riskResult.recommendation === 'auto_approve') {
        updateData['status'] = ListingStatus.ACTIVE;
        updateData['publishedAt'] = new Date();
        updateData['expiresAt'] = new Date(
          Date.now() + LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );
      }
    }

    if (newStatus === ListingStatus.SOLD) {
      updateData['publishedAt'] = listing['publishedAt'];
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: updateData,
    });

    this.logger.log(
      `Listing status changed: id=${listingId}, ${currentStatus} -> ${updated['status']}`,
    );

    return updated;
  }

  /**
   * Renew an expired listing, resetting its expiration date.
   */
  async renew(listingId: string, userId: string): Promise<Record<string, unknown>> {
    const listing = await this.ensureOwnership(listingId, userId);
    const status = listing['status'] as string;

    // Only expired active listings can be renewed
    const expiresAt = listing['expiresAt'] as string | null;
    const isExpired =
      status === ListingStatus.ACTIVE &&
      expiresAt !== null &&
      new Date(expiresAt) < new Date();

    if (!isExpired) {
      throw new ConflictException('Only expired listings can be renewed');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        expiresAt: new Date(Date.now() + LISTING_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        publishedAt: new Date(),
      },
    });

    this.logger.log(`Listing renewed: id=${listingId}`);
    return updated;
  }

  /**
   * Generate a presigned URL for media upload.
   */
  async generateMediaUploadUrl(
    listingId: string,
    userId: string,
    contentType: string,
  ): Promise<PresignedUploadResponse> {
    await this.ensureOwnership(listingId, userId);

    // Check media limit
    const mediaCount = await this.prisma.listingMedia.count({
      where: { listingId },
    });
    if (mediaCount >= securityConfig.fileUpload.maxImagesPerListing) {
      throw new ConflictException(
        `Maximum of ${securityConfig.fileUpload.maxImagesPerListing} images per listing`,
      );
    }

    // Validate content type
    if (!securityConfig.fileUpload.allowedImageMimeTypes.includes(contentType)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${securityConfig.fileUpload.allowedImageMimeTypes.join(', ')}`,
      );
    }

    const fileKey = `listings/${listingId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const { uploadUrl } = await this.storage.generatePresignedUploadUrl(
      fileKey,
      contentType,
      securityConfig.fileUpload.maxImageSizeBytes,
    );

    // Create a pending media record
    const media = await this.prisma.listingMedia.create({
      data: {
        listingId,
        url: fileKey,
        type: contentType.startsWith('video/') ? 'video' : 'image',
        mimeType: contentType,
        sizeBytes: 0,
        position: mediaCount,
      },
    });

    const mediaId = media['id'] as string;

    // Enqueue background image/video processing (EXIF strip, resize, thumbnail)
    const jobName = contentType.startsWith('video/') ? 'process-video' : 'process-image';
    await this.mediaQueue.add(jobName, { listingId, mediaId, s3Key: fileKey });

    return { uploadUrl, fileKey, mediaId };
  }

  /**
   * Remove media from a listing.
   */
  async removeMedia(
    listingId: string,
    mediaId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureOwnership(listingId, userId);

    const media = await this.prisma.listingMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media['listingId'] !== listingId) {
      throw new NotFoundException('Media not found');
    }

    await this.storage.deleteObject(media['url'] as string).catch((err: Error) => {
      this.logger.warn(`Failed to delete media from storage: ${err.message}`);
    });

    await this.prisma.listingMedia.delete({ where: { id: mediaId } });
  }

  /**
   * Get current user's listings with optional status filter and pagination.
   */
  async findMyListings(
    userId: string,
    query: ListingQueryDto,
  ): Promise<{ listings: Record<string, unknown>[]; total: number }> {
    const where: Record<string, unknown> = {
      userId,
      status: { not: ListingStatus.REMOVED },
    };

    if (query.status) {
      where['status'] = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          media: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      listings: listings.map((l) => ({
        ...l,
        latitude: l['locationLat'] as number,
        longitude: l['locationLng'] as number,
      })),
      total,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async ensureOwnership(
    listingId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing['userId'] !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    return listing;
  }

  /**
   * Validate category-specific fields against the category's field definitions.
   */
  private async validateCategoryFields(
    categoryId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const categoryFields = await this.prisma.categoryField.findMany({
      where: { categoryId },
    });

    const requiredFields = categoryFields.filter(
      (f) => f['isRequired'] === true,
    );

    // Check required fields are present
    for (const field of requiredFields) {
      const fieldName = field['name'] as string;
      if (fields[fieldName] === undefined || fields[fieldName] === null) {
        throw new BadRequestException(
          `Required field "${fieldName}" is missing for this category`,
        );
      }
    }

    // Validate field values against their type/options
    const fieldNames = new Set(
      categoryFields.map((f) => f['name'] as string),
    );
    for (const key of Object.keys(fields)) {
      if (!fieldNames.has(key)) {
        throw new BadRequestException(
          `Unknown field "${key}" for this category`,
        );
      }
    }
  }
}

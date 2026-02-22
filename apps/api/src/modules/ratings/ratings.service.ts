import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto, RatingType } from './dto/create-rating.dto';
import { RatingQueryDto } from './dto/rating-query.dto';

/** Minimum number of messages in a conversation to qualify for rating */
const MIN_MESSAGES_FOR_RATING = 2;

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a rating. Validates qualifying interaction and prevents duplicates.
   * After creation, updates the reviewee's cached avgRating and ratingCount.
   */
  async createRating(
    reviewerId: string,
    dto: CreateRatingDto,
  ): Promise<Record<string, unknown>> {
    // Reviewer cannot rate themselves
    if (reviewerId === dto.revieweeId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    // Validate the listing exists
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, userId: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Validate the reviewee exists
    const reviewee = await this.prisma.user.findUnique({
      where: { id: dto.revieweeId },
      select: { id: true },
    });

    if (!reviewee) {
      throw new NotFoundException('Reviewee not found');
    }

    // Validate rating type matches the roles
    if (dto.ratingType === RatingType.BUYER_TO_SELLER) {
      // Reviewer is buyer, reviewee must be seller (listing owner)
      if (listing.userId !== dto.revieweeId) {
        throw new BadRequestException(
          'For buyer-to-seller ratings, the reviewee must be the listing owner',
        );
      }
    } else {
      // Reviewer is seller, reviewee must be buyer
      if (listing.userId !== reviewerId) {
        throw new BadRequestException(
          'For seller-to-buyer ratings, you must be the listing owner',
        );
      }
    }

    // Find the qualifying conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        listingId: dto.listingId,
        OR: [
          { buyerId: reviewerId, sellerId: dto.revieweeId },
          { buyerId: dto.revieweeId, sellerId: reviewerId },
        ],
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'A qualifying interaction (conversation) is required before rating',
      );
    }

    // Validate minimum message count
    const messageCount = await this.prisma.message.count({
      where: { conversationId: conversation.id },
    });

    if (messageCount < MIN_MESSAGES_FOR_RATING) {
      throw new ForbiddenException(
        `At least ${MIN_MESSAGES_FOR_RATING} messages are required in the conversation before rating`,
      );
    }

    // Check for duplicate rating
    const existingRating = await this.prisma.rating.findUnique({
      where: {
        raterId_ratedUserId_listingId: {
          raterId: reviewerId,
          ratedUserId: dto.revieweeId,
          listingId: dto.listingId,
        },
      },
    });

    if (existingRating) {
      throw new ConflictException('You have already rated this user for this listing');
    }

    // Create the rating
    const rating = await this.prisma.rating.create({
      data: {
        raterId: reviewerId,
        ratedUserId: dto.revieweeId,
        listingId: dto.listingId,
        conversationId: conversation.id,
        score: dto.score,
        comment: dto.comment ?? null,
      },
      include: {
        rater: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        listing: {
          select: { id: true, title: true },
        },
      },
    });

    // Update reviewee's cached avgRating and ratingCount
    await this.updateUserRatingStats(dto.revieweeId);

    this.logger.log(
      `Rating created: reviewer=${reviewerId}, reviewee=${dto.revieweeId}, ` +
        `listing=${dto.listingId}, score=${dto.score}`,
    );

    return rating;
  }

  /**
   * Get all ratings for a specific user (paginated).
   */
  async getRatingsForUser(
    userId: string,
    query: RatingQueryDto,
  ): Promise<{ ratings: Record<string, unknown>[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      ratedUserId: userId,
      isHidden: false,
    };

    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rater: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          listing: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);

    return { ratings, total };
  }

  /**
   * Get ratings for a specific listing (paginated).
   */
  async getRatingsForListing(
    listingId: string,
    query: RatingQueryDto,
  ): Promise<{ ratings: Record<string, unknown>[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      listingId,
      isHidden: false,
    };

    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        orderBy: { createdAt: query.sortOrder ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rater: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);

    return { ratings, total };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Recalculate and update a user's avgRating and ratingCount.
   */
  private async updateUserRatingStats(userId: string): Promise<void> {
    const stats = await this.prisma.rating.aggregate({
      where: { ratedUserId: userId, isHidden: false },
      _avg: { score: true },
      _count: { score: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ratingAvg: stats._avg.score
          ? new Prisma.Decimal(stats._avg.score.toFixed(1))
          : null,
        ratingCount: stats._count.score,
      },
    });
  }
}

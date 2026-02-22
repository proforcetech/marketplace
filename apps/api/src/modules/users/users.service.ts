import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey ?? '', {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }

  /**
   * Get the current user's full profile (including sensitive fields).
   */
  async getMyProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        phoneVerified: true,
        bio: true,
        identityVerified: true,
        locationLat: true,
        locationLng: true,
        locationCity: true,
        locationState: true,
        role: true,
        status: true,
        responseRate: true,
        ratingAvg: true,
        ratingCount: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update the current user's profile.
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.displayName !== undefined) updateData['displayName'] = dto.displayName;
    if (dto.bio !== undefined) updateData['bio'] = dto.bio;
    if (dto.avatarUrl !== undefined) updateData['avatarUrl'] = dto.avatarUrl;
    if (dto.city !== undefined) updateData['locationCity'] = dto.city;
    if (dto.state !== undefined) updateData['locationState'] = dto.state;
    if (dto.locationLat !== undefined) updateData['locationLat'] = dto.locationLat;
    if (dto.locationLng !== undefined) updateData['locationLng'] = dto.locationLng;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        locationCity: true,
        locationState: true,
        updatedAt: true,
      },
    });

    // Update PostGIS location if coordinates changed
    if (dto.locationLat !== undefined && dto.locationLng !== undefined) {
      await this.prisma.$queryRaw`
        UPDATE users
        SET location = ST_SetSRID(ST_MakePoint(${dto.locationLng}, ${dto.locationLat}), 4326)::geography
        WHERE id = ${userId}
      `;
    }

    return updated;
  }

  /**
   * Get a public user profile (hides email, phone, sensitive fields).
   */
  async getPublicProfile(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        identityVerified: true,
        locationCity: true,
        locationState: true,
        responseRate: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count active listings
    const listingCount = await this.prisma.listing.count({
      where: { userId, status: 'active' },
    });

    return {
      ...user,
      memberSince: user.createdAt,
      listingCount,
    };
  }

  /**
   * Get a user's active listings (paginated).
   */
  async getUserListings(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ listings: Record<string, unknown>[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = { userId, status: 'active' as const };

    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          media: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { listings, total };
  }

  /**
   * Generate a presigned S3 URL for avatar upload.
   */
  async generateAvatarUploadUrl(
    userId: string,
  ): Promise<{ uploadUrl: string; avatarUrl: string }> {
    // In production, this would use the S3 storage service.
    // For now, return a placeholder structure.
    const fileKey = `avatars/${userId}/${Date.now()}.webp`;
    const cdnBase = this.configService.get<string>('CDN_URL') ?? 'https://cdn.example.com';

    return {
      uploadUrl: `${cdnBase}/upload/${fileKey}`,
      avatarUrl: `${cdnBase}/${fileKey}`,
    };
  }

  /**
   * Initiate a Stripe Identity verification session.
   */
  async initiateIdentityVerification(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, identityVerified: true, stripeIdentityId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.identityVerified) {
      throw new BadRequestException('Identity is already verified');
    }

    const returnUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

    const session = await this.stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId },
      return_url: `${returnUrl}/settings/verification?status=complete`,
    });

    // Store the session ID for webhook processing
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeIdentityId: session.id },
    });

    return { url: session.url ?? '' };
  }

  /**
   * Handle Stripe Identity webhook: mark user as identity-verified.
   */
  async handleIdentityVerified(sessionId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { stripeIdentityId: sessionId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`No user found for Identity session: ${sessionId}`);
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { identityVerified: true },
    });

    this.logger.log(`Identity verified for user: ${user.id}`);
  }

  /**
   * Get user's notifications (paginated).
   */
  async getNotifications(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ notifications: Record<string, unknown>[]; total: number; unreadCount: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = { userId };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Mark a single notification as read.
   */
  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllNotificationsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return result.count;
  }

  /**
   * Register or reactivate a device push token.
   */
  async registerPushToken(
    userId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { token, userId, platform, isActive: true },
      update: { isActive: true, userId },
    });
  }

  /**
   * Deactivate a device push token on logout.
   */
  async removePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: { token, userId },
      data: { isActive: false },
    });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminUserQueryDto, AdminReportQueryDto, AuditLogQueryDto } from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async getDashboardStats(): Promise<Record<string, number>> {
    const [totalUsers, totalListings, pendingReview, openReports, activePromos] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { status: 'active' } }),
        this.prisma.listing.count({ where: { status: 'active' } }),
        this.prisma.listing.count({ where: { status: 'pending_review' } }),
        this.prisma.report.count({ where: { status: 'pending' } }),
        this.prisma.promotionPurchase.count({ where: { status: 'active' } }),
      ]);

    return { totalUsers, totalListings, pendingReview, openReports, activePromos };
  }

  async getModerationQueue(
    page: number,
    limit: number,
  ): Promise<{ listings: Record<string, unknown>[]; total: number }> {
    const where = { status: 'pending_review' as const };
    const [listings, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, displayName: true, email: true, ratingAvg: true } },
          media: { take: 1, orderBy: { position: 'asc' } },
          category: { select: { name: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { listings, total };
  }

  async approveListing(listingId: string, adminId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, userId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.$transaction([
      this.prisma.listing.update({ where: { id: listingId }, data: { status: 'active', publishedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: { actorId: adminId, actorType: 'admin', action: 'listing_approved', targetType: 'listing', targetId: listingId },
      }),
      this.prisma.notification.create({
        data: {
          userId: listing.userId,
          type: 'listing_approved',
          title: 'Listing approved',
          body: `Your listing "${listing.title}" is now live.`,
          data: { listingId },
        },
      }),
    ]);

    await this.notificationQueue.add('send-push', {
      userId: listing.userId,
      title: 'Listing approved',
      body: `Your listing "${listing.title}" is now live.`,
      data: { listingId, type: 'listing_approved' },
    });
  }

  async rejectListing(listingId: string, adminId: string, reason: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, userId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.$transaction([
      this.prisma.listing.update({ where: { id: listingId }, data: { status: 'rejected', rejectionReason: reason } }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorType: 'admin',
          action: 'listing_rejected',
          targetType: 'listing',
          targetId: listingId,
          details: { reason },
        },
      }),
      this.prisma.notification.create({
        data: {
          userId: listing.userId,
          type: 'listing_rejected',
          title: 'Listing not approved',
          body: `Your listing "${listing.title}" was not approved: ${reason}`,
          data: { listingId, reason },
        },
      }),
    ]);

    await this.notificationQueue.add('send-push', {
      userId: listing.userId,
      title: 'Listing not approved',
      body: `Your listing "${listing.title}" was not approved.`,
      data: { listingId, type: 'listing_rejected' },
    });
  }

  async removeListing(listingId: string, adminId: string, reason: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.$transaction([
      this.prisma.listing.update({ where: { id: listingId }, data: { status: 'removed' } }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorType: 'admin',
          action: 'listing_removed',
          targetType: 'listing',
          targetId: listingId,
          details: { reason },
        },
      }),
    ]);
  }

  async searchUsers(
    dto: AdminUserQueryDto,
  ): Promise<{ users: Record<string, unknown>[]; total: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where = dto.search
      ? {
          OR: [
            { displayName: { contains: dto.search, mode: 'insensitive' as const } },
            { email: { contains: dto.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          phoneVerified: true,
          identityVerified: true,
          ratingAvg: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getUserDetail(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, displayName: true, avatarUrl: true, phone: true,
        phoneVerified: true, identityVerified: true, role: true, status: true,
        ratingAvg: true,
        ratingCount: true, responseRate: true, createdAt: true, lastActiveAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [listingCount, reportCount, recentActions] = await Promise.all([
      this.prisma.listing.count({ where: { userId } }),
      this.prisma.report.count({ where: { targetId: userId, targetType: 'user' } }),
      this.prisma.auditLog.findMany({
        where: { targetId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { action: true, actorId: true, details: true, createdAt: true },
      }),
    ]);

    return { ...user, listingCount, reportCount, recentActions };
  }

  async banUser(userId: string, adminId: string, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'banned' },
      }),
      this.prisma.listing.updateMany({
        where: { userId, status: { in: ['active', 'pending_review'] } },
        data: { status: 'removed' },
      }),
      this.prisma.auditLog.create({
        data: { actorId: adminId, actorType: 'admin', action: 'user_banned', targetType: 'user', targetId: userId, details: { reason } },
      }),
    ]);
  }

  async shadowBanUser(userId: string, adminId: string, reason: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: 'shadow_banned' } }),
      this.prisma.auditLog.create({
        data: { actorId: adminId, actorType: 'admin', action: 'user_shadow_banned', targetType: 'user', targetId: userId, details: { reason } },
      }),
    ]);
  }

  async unsuspendUser(userId: string, adminId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'active' },
      }),
      this.prisma.auditLog.create({
        data: { actorId: adminId, actorType: 'admin', action: 'user_unsuspended', targetType: 'user', targetId: userId },
      }),
    ]);
  }

  async suspendUser(userId: string, adminId: string, reason: string, days: number): Promise<void> {
    const until = new Date();
    until.setDate(until.getDate() + days);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: 'suspended' } }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorType: 'admin',
          action: 'user_suspended',
          targetType: 'user',
          targetId: userId,
          details: { reason, days, until: until.toISOString() },
        },
      }),
    ]);
  }

  async getReports(
    dto: AdminReportQueryDto,
  ): Promise<{ reports: Record<string, unknown>[]; total: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (dto.status) where['status'] = dto.status;
    if (dto.targetType) where['targetType'] = dto.targetType;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: { id: true, displayName: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total };
  }

  async resolveReport(
    reportId: string,
    adminId: string,
    status: string,
    notes?: string,
  ): Promise<Record<string, unknown>> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as ReportStatus,
        resolvedById: adminId,
        resolvedAt: new Date(),
        ...(notes ? { resolutionNotes: notes } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: `report_${status}`,
        targetType: 'report',
        targetId: reportId,
        details: { notes },
      },
    });

    return updated;
  }

  async getAuditLog(
    dto: AuditLogQueryDto,
  ): Promise<{ logs: Record<string, unknown>[]; total: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (dto.actorId) where['actorId'] = dto.actorId;
    if (dto.targetType) where['targetType'] = dto.targetType;
    if (dto.action) where['action'] = { contains: dto.action };
    if (dto.startDate || dto.endDate) {
      where['createdAt'] = {
        ...(dto.startDate ? { gte: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { lte: new Date(dto.endDate) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, displayName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

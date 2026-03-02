import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateReportDto } from './dto/create-report.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

/** Number of pending reports against a target before auto-escalation */
const AUTO_ESCALATE_THRESHOLD = 3;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<Record<string, unknown>> {
    // Validate target exists
    let evidence: Record<string, unknown> = {};
    if (dto.targetType === 'listing') {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.targetId },
        select: { id: true, title: true, description: true, status: true },
      });
      if (!listing) throw new NotFoundException('Listing not found');
      evidence = { listing: { title: listing.title, description: listing.description, status: listing.status } };
    } else if (dto.targetType === 'user') {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.targetId },
        select: { id: true, displayName: true },
      });
      if (!user) throw new NotFoundException('User not found');
      evidence = { user: { displayName: user.displayName } };
    } else if (dto.targetType === 'message') {
      const message = await this.prisma.message.findUnique({
        where: { id: dto.targetId },
        select: { id: true, body: true, senderId: true },
      });
      if (!message) throw new NotFoundException('Message not found');
      evidence = { message: { body: message.body, senderId: message.senderId } };
    }

    // Check for duplicate pending report from same reporter
    const duplicate = await this.prisma.report.findFirst({
      where: { reporterId, targetId: dto.targetId, targetType: dto.targetType, status: 'pending' },
    });
    if (duplicate) throw new ConflictException('You have already submitted a report for this item');

    // Count existing pending reports against this target for auto-escalation
    const existingCount = await this.prisma.report.count({
      where: { targetId: dto.targetId, targetType: dto.targetType, status: 'pending' },
    });
    const priority = existingCount + 1 >= AUTO_ESCALATE_THRESHOLD ? 'high' : 'normal';

    if (priority === 'high') {
      this.logger.warn(
        `Auto-escalating ${dto.targetType} ${dto.targetId}: ${existingCount + 1} reports`,
      );
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        details: dto.description ?? null,
        evidence: evidence as Prisma.InputJsonValue,
        status: 'pending',
        priority,
      },
    });

    return report;
  }

  async getMyReports(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ reports: Record<string, unknown>[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = { reporterId: userId };
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total };
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';

const MAX_SAVED_SEARCHES_PER_USER = 20;

@Injectable()
export class SavedSearchesService {
  private readonly logger = new Logger(SavedSearchesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new saved search for the current user.
   * Enforces a cap of 20 saved searches per user.
   */
  async create(
    userId: string,
    dto: CreateSavedSearchDto,
  ): Promise<Record<string, unknown>> {
    const count = await this.prisma.savedSearch.count({ where: { userId } });

    if (count >= MAX_SAVED_SEARCHES_PER_USER) {
      throw new BadRequestException(
        `You can save up to ${MAX_SAVED_SEARCHES_PER_USER} searches. Delete one to add a new one.`,
      );
    }

    const saved = await this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name ?? null,
        query: dto.query,
        notify: dto.notify ?? true,
      },
    });

    return saved as unknown as Record<string, unknown>;
  }

  /**
   * List all saved searches for the current user.
   */
  async findAllForUser(userId: string): Promise<Record<string, unknown>[]> {
    const searches = await this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return searches as unknown as Record<string, unknown>[];
  }

  /**
   * Delete a saved search. Only the owner can delete it.
   */
  async delete(id: string, userId: string): Promise<void> {
    const search = await this.prisma.savedSearch.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    if (search.userId !== userId) {
      throw new ForbiddenException('You do not own this saved search');
    }

    await this.prisma.savedSearch.delete({ where: { id } });
  }

  /**
   * Toggle email notifications for a saved search on or off.
   */
  async toggleNotify(
    id: string,
    userId: string,
    notify: boolean,
  ): Promise<Record<string, unknown>> {
    const search = await this.prisma.savedSearch.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    if (search.userId !== userId) {
      throw new ForbiddenException('You do not own this saved search');
    }

    const updated = await this.prisma.savedSearch.update({
      where: { id },
      data: { notify },
    });

    return updated as unknown as Record<string, unknown>;
  }

  /**
   * Scheduled job: check for new listings matching saved searches and
   * update lastNotifiedAt. Runs once per day at 8:00 AM.
   *
   * Full notification dispatch (email/push) would be done here in production
   * by queuing a NotificationsProcessor job per matched user.
   */
  @Cron('0 8 * * *')
  async checkSavedSearchMatches(): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

    // Get all saved searches that want notifications
    const searches = await this.prisma.savedSearch.findMany({
      where: { notify: true },
      select: {
        id: true,
        userId: true,
        query: true,
        lastNotifiedAt: true,
        user: {
          select: { id: true, email: true, displayName: true, status: true },
        },
      },
    });

    let notified = 0;

    for (const search of searches) {
      if (search.user.status !== 'active') continue;

      // Check if any new listings were created since last notification
      // (or since yesterday if never notified)
      const checkSince = search.lastNotifiedAt ?? since;
      const query = search.query as Record<string, unknown>;

      const matchCount = await this.prisma.listing.count({
        where: {
          status: 'active',
          createdAt: { gt: checkSince },
          // Apply category filter if present in saved query
          ...(query['category']
            ? { category: { slug: String(query['category']) } }
            : {}),
          // Apply basic keyword filter if present
          ...(query['query']
            ? {
                OR: [
                  { title: { contains: String(query['query']), mode: 'insensitive' } },
                  { description: { contains: String(query['query']), mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      });

      if (matchCount > 0) {
        // Create an in-app notification
        await this.prisma.notification
          .create({
            data: {
              userId: search.userId,
              type: 'saved_search_match',
              title: 'New listings for your saved search',
              body: `${matchCount} new listing${matchCount === 1 ? '' : 's'} match${matchCount === 1 ? 'es' : ''} your saved search${search.query && (search.query as Record<string, unknown>)['query'] ? ` for "${(search.query as Record<string, unknown>)['query']}"` : ''}.`,
              data: { savedSearchId: search.id, matchCount, query: search.query },
            },
          })
          .catch((err: Error) => {
            this.logger.warn(`Failed to create saved search notification: ${err.message}`);
          });

        // Stamp lastNotifiedAt
        await this.prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastNotifiedAt: new Date() },
        });

        notified++;
      }
    }

    if (notified > 0) {
      this.logger.log(`Saved search notifications dispatched for ${notified} search(es)`);
    }
  }
}

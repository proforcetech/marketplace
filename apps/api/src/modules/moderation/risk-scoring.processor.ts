import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskScoringService } from './risk-scoring.service';

/**
 * Async risk scoring processor for listings.
 *
 * Runs after listing creation to compute a risk score based on content analysis.
 * High-risk listings are held for review or auto-rejected.
 *
 * Job queue: 'risk-scoring'
 * Job types: 'score-listing'
 */

interface ScoreListingJobData {
  listingId: string;
}

@Processor('risk-scoring')
export class RiskScoringProcessor {
  private readonly logger = new Logger(RiskScoringProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskScoringService: RiskScoringService,
  ) {}

  @Process('score-listing')
  async handleScoreListing(job: Job<ScoreListingJobData>): Promise<void> {
    const { listingId } = job.data;
    this.logger.log(`Scoring listing: listingId=${listingId}`);

    try {
      // Fetch the listing with its owner info
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          user: {
            select: {
              id: true,
              createdAt: true,
              phoneVerified: true,
              identityVerified: true,
              email: true,
            },
          },
        },
      });

      if (!listing) {
        this.logger.warn(
          `Listing not found for risk scoring: listingId=${listingId}`,
        );
        return;
      }

      const title = (listing.title as string) ?? '';
      const description = (listing.description as string) ?? '';
      const contentText = `${title} ${description}`.trim();

      // Check perceptual hashes against blocklist
      const mediaItems = await this.prisma.listingMedia.findMany({
        where: { listingId, hash: { not: null } },
        select: { hash: true },
      });
      const hashes = mediaItems.map((m) => m.hash).filter((h): h is string => h !== null);
      const knownBadMediaMatch =
        hashes.length > 0
          ? (await this.prisma.badMediaHash.count({ where: { hash: { in: hashes } } })) > 0
          : false;

      // Build content signals for scoring.
      const riskResult = this.riskScoringService.calculateListingRiskScore(
        {
          accountAgeHours: this.computeAccountAgeHours(listing.user?.createdAt),
          phoneVerified: listing.user?.phoneVerified === true,
          identityVerified: listing.user?.identityVerified === true,
          emailDomain: this.extractEmailDomain(listing.user?.email),
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
          knownBadMediaMatch,
          nsfwScore: 0,
          contactInfoInText: false,
          posterTrustLevel: 2,
        },
      );

      const score = riskResult.score;

      this.logger.log(
        `Risk score calculated: listingId=${listingId}, score=${score}, recommendation=${riskResult.recommendation}, content="${contentText.substring(0, 100)}"`,
      );

      // Determine action based on score thresholds
      const updateData: Record<string, unknown> = {
        riskScore: score,
      };

      if (score >= 90) {
        // Auto-reject: very high risk
        updateData['status'] = 'rejected';

        await this.prisma.listing.update({
          where: { id: listingId },
          data: updateData,
        });

        await this.createModerationAction(
          listingId,
          'auto_reject',
          score,
          riskResult.recommendation,
        );

        this.logger.warn(
          `Listing auto-rejected: listingId=${listingId}, score=${score}`,
        );
      } else if (score >= 70) {
        // Hold for review: high risk
        updateData['status'] = 'pending_review';

        await this.prisma.listing.update({
          where: { id: listingId },
          data: updateData,
        });

        await this.createModerationAction(
          listingId,
          'hold_for_review',
          score,
          riskResult.recommendation,
        );

        this.logger.warn(
          `Listing held for review: listingId=${listingId}, score=${score}`,
        );
      } else {
        // Low/medium risk: just update the score
        await this.prisma.listing.update({
          where: { id: listingId },
          data: updateData,
        });

        this.logger.log(
          `Listing risk score updated (no action needed): listingId=${listingId}, score=${score}`,
        );
      }
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to score listing: listingId=${listingId}, error=${errMsg}`,
      );
      throw error;
    }
  }

  private async createModerationAction(
    listingId: string,
    action: string,
    score: number,
    recommendation: string,
  ): Promise<void> {
    try {
      await this.prisma.moderationAction.create({
        data: {
          listingId,
          action,
          reason: `Automated risk scoring: score=${score}, recommendation=${recommendation}`,
          performedBy: 'system',
          createdAt: new Date(),
        },
      });
    } catch (error: unknown) {
      // Log but don't fail the main job if moderation record creation fails
      const errMsg =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create moderation action record: listingId=${listingId}, error=${errMsg}`,
      );
    }
  }

  private computeAccountAgeHours(
    createdAt: unknown,
  ): number {
    if (!createdAt) {
      return 0;
    }
    const created =
      createdAt instanceof Date ? createdAt : new Date(String(createdAt));
    const ageMs = Date.now() - created.getTime();
    return Math.max(0, ageMs / (1000 * 60 * 60));
  }

  private extractEmailDomain(email: unknown): string {
    if (typeof email !== 'string') {
      return '';
    }
    const parts = email.split('@');
    return parts.length === 2 ? (parts[1] ?? '') : '';
  }
}

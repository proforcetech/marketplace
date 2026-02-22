import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { RespondOfferDto } from './dto/respond-offer.dto';

/** Offers expire 48 hours after creation. */
const OFFER_EXPIRY_HOURS = 48;

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new offer on a listing within an existing conversation.
   * Validates listing status, conversation membership, and duplicate-offer prevention.
   */
  async create(
    buyerId: string,
    dto: CreateOfferDto,
  ): Promise<Record<string, unknown>> {
    // Validate listing exists and is active
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, userId: true, status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new BadRequestException('Only active listings can receive offers');
    }

    if (listing.userId === buyerId) {
      throw new BadRequestException('Cannot make an offer on your own listing');
    }

    // Validate conversation exists and buyer is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { id: true, buyerId: true, sellerId: true, listingId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.buyerId !== buyerId && conversation.sellerId !== buyerId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    if (conversation.listingId !== dto.listingId) {
      throw new BadRequestException('Conversation does not belong to this listing');
    }

    // Check for an existing pending offer from this buyer on this listing
    const existingPending = await this.prisma.offer.findFirst({
      where: {
        listingId: dto.listingId,
        buyerId,
        status: 'pending',
      },
    });

    if (existingPending) {
      throw new ConflictException('You already have a pending offer on this listing');
    }

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

    const offer = await this.prisma.offer.create({
      data: {
        listingId: dto.listingId,
        buyerId,
        sellerId: listing.userId,
        conversationId: dto.conversationId,
        amountCents: dto.amountCents,
        message: dto.message ?? null,
        status: 'pending',
        expiresAt,
      },
    });

    // Create a system message in the conversation
    const amountDisplay = (dto.amountCents / 100).toFixed(2);
    await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: buyerId,
        body: `Offer sent: $${amountDisplay}`,
        type: 'offer',
      },
    });

    // Update conversation lastMessageAt
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return offer as unknown as Record<string, unknown>;
  }

  /**
   * Respond to an offer: accept, decline, or counter.
   *
   * Accept/decline: only the party who did NOT create the offer can respond.
   * Counter: either buyer or seller can counter (the non-originating party).
   * When countering, a new child offer is created with swapped responder roles.
   */
  async respond(
    offerId: string,
    userId: string,
    dto: RespondOfferDto,
  ): Promise<Record<string, unknown>> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: { select: { id: true, status: true } },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status !== 'pending') {
      throw new BadRequestException(`Cannot respond to an offer with status '${offer.status}'`);
    }

    // The responder must be the other party (not the one who made this offer).
    // For the initial offer, buyerId created it so sellerId responds.
    // For counteroffers, the roles swap with each counter.
    const isResponder =
      (offer.sellerId === userId && offer.buyerId !== userId) ||
      (offer.buyerId === userId && offer.sellerId !== userId);

    // In this model the "sellerId" on the offer is the intended responder
    // for the initial offer (seller responds to buyer's offer).
    // For counteroffers, parentOfferId is set and the responder is the other party.
    if (offer.sellerId !== userId) {
      throw new ForbiddenException('You are not authorized to respond to this offer');
    }

    // Check expiry
    if (offer.expiresAt && new Date() > offer.expiresAt) {
      // Mark as expired if not already
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'expired' },
      });
      throw new BadRequestException('This offer has expired');
    }

    const now = new Date();

    if (dto.action === 'accepted') {
      const updatedOffer = await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'accepted', respondedAt: now },
      });

      // Create system message
      const amountDisplay = (offer.amountCents / 100).toFixed(2);
      await this.prisma.message.create({
        data: {
          conversationId: offer.conversationId,
          senderId: userId,
          body: `Offer accepted: $${amountDisplay}`,
          type: 'offer',
        },
      });

      // Update conversation lastMessageAt
      await this.prisma.conversation.update({
        where: { id: offer.conversationId },
        data: { lastMessageAt: now },
      });

      // Mark listing as sold
      await this.prisma.listing.update({
        where: { id: offer.listingId },
        data: { status: 'sold' },
      });

      return updatedOffer as unknown as Record<string, unknown>;
    }

    if (dto.action === 'declined') {
      const updatedOffer = await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: 'declined', respondedAt: now },
      });

      await this.prisma.message.create({
        data: {
          conversationId: offer.conversationId,
          senderId: userId,
          body: 'Offer declined',
          type: 'offer',
        },
      });

      await this.prisma.conversation.update({
        where: { id: offer.conversationId },
        data: { lastMessageAt: now },
      });

      return updatedOffer as unknown as Record<string, unknown>;
    }

    // action === 'countered'
    if (!dto.counterAmountCents) {
      throw new BadRequestException('counterAmountCents is required when countering');
    }

    // Mark original offer as countered
    await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'countered', respondedAt: now },
    });

    // Create a new counteroffer. The "buyer" and "seller" swap roles relative
    // to who needs to respond: the original offer's buyerId becomes the sellerId
    // (responder) on the counter, and vice versa.
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

    const counterOffer = await this.prisma.offer.create({
      data: {
        listingId: offer.listingId,
        buyerId: offer.sellerId, // the current responder becomes the "offeror"
        sellerId: offer.buyerId, // the original offeror becomes the new responder
        conversationId: offer.conversationId,
        amountCents: dto.counterAmountCents,
        message: dto.message ?? null,
        status: 'pending',
        parentOfferId: offerId,
        expiresAt,
      },
    });

    const counterAmountDisplay = (dto.counterAmountCents / 100).toFixed(2);
    await this.prisma.message.create({
      data: {
        conversationId: offer.conversationId,
        senderId: userId,
        body: `Counteroffer: $${counterAmountDisplay}`,
        type: 'offer',
      },
    });

    await this.prisma.conversation.update({
      where: { id: offer.conversationId },
      data: { lastMessageAt: now },
    });

    return counterOffer as unknown as Record<string, unknown>;
  }

  /**
   * Withdraw a pending offer. Only the buyer (creator) can withdraw.
   */
  async withdraw(offerId: string, buyerId: string): Promise<void> {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, buyerId: true, status: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.buyerId !== buyerId) {
      throw new ForbiddenException('You can only withdraw your own offers');
    }

    if (offer.status !== 'pending' && offer.status !== 'countered') {
      throw new BadRequestException(
        `Cannot withdraw an offer with status '${offer.status}'`,
      );
    }

    await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'withdrawn' },
    });
  }

  /**
   * Get all offers for a specific listing. Only accessible by the listing's
   * buyer or seller (someone involved in offers on that listing).
   */
  async getForListing(
    listingId: string,
    userId: string,
  ): Promise<Record<string, unknown>[]> {
    // Verify the user is the listing owner or a buyer with offers on it
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, userId: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const offers = await this.prisma.offer.findMany({
      where: {
        listingId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountCents: true,
        status: true,
        message: true,
        parentOfferId: true,
        expiresAt: true,
        respondedAt: true,
        createdAt: true,
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return offers as unknown as Record<string, unknown>[];
  }

  /**
   * Get all offers where the user is either buyer or seller.
   * Includes listing title and first image for display.
   */
  async getMyOffers(userId: string): Promise<Record<string, unknown>[]> {
    const offers = await this.prisma.offer.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountCents: true,
        status: true,
        message: true,
        parentOfferId: true,
        expiresAt: true,
        respondedAt: true,
        createdAt: true,
        buyerId: true,
        sellerId: true,
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            media: { take: 1, orderBy: { position: 'asc' }, select: { url: true, thumbnailUrl: true } },
          },
        },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return offers as unknown as Record<string, unknown>[];
  }

  /**
   * Scheduled job: expire pending offers whose expiresAt has passed.
   * Runs every 6 hours.
   */
  @Cron('0 */6 * * *')
  async expirePendingOffers(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.offer.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: now },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} pending offer(s)`);
    }
  }
}

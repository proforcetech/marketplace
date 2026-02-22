import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface ExchangeTokenPayload {
  sub: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
}

interface GenerateTokenResult {
  token: string;
  expiresAt: Date;
}

interface ConfirmExchangeResult {
  conversationId: string;
  listingId: string;
}

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generate a QR-code exchange token for a conversation.
   * Only the seller may generate the token.
   * The token is a signed JWT valid for 15 minutes and is persisted in the database.
   */
  async generateExchangeToken(
    conversationId: string,
    requesterId: string,
  ): Promise<GenerateTokenResult> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { listing: true, buyer: true, seller: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (requesterId !== conversation.sellerId) {
      throw new ForbiddenException(
        'Only the seller can generate an exchange token',
      );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const payload: ExchangeTokenPayload = {
      sub: conversationId,
      buyerId: conversation.buyerId,
      sellerId: conversation.sellerId,
      listingId: conversation.listingId,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    await this.prisma.exchangeToken.create({
      data: {
        token,
        conversationId,
        sellerId: conversation.sellerId,
        buyerId: conversation.buyerId,
        listingId: conversation.listingId,
        expiresAt,
      },
    });

    this.logger.log(
      `Exchange token generated for conversation ${conversationId} by seller ${requesterId}`,
    );

    return { token, expiresAt };
  }

  /**
   * Confirm an exchange by scanning a QR-code token.
   * Only the buyer may confirm the exchange.
   * Marks the token as used and creates notifications for both parties.
   */
  async confirmExchange(
    token: string,
    requesterId: string,
  ): Promise<ConfirmExchangeResult> {
    const exchangeToken = await this.prisma.exchangeToken.findUnique({
      where: { token },
    });

    if (!exchangeToken) {
      throw new NotFoundException('Invalid or expired token');
    }

    if (exchangeToken.usedAt) {
      throw new BadRequestException('This token has already been used');
    }

    if (exchangeToken.expiresAt < new Date()) {
      throw new BadRequestException('This token has expired');
    }

    // Verify the JWT signature and claims are intact
    try {
      this.jwtService.verify<ExchangeTokenPayload>(token);
    } catch {
      throw new BadRequestException('Token signature verification failed');
    }

    if (requesterId !== exchangeToken.buyerId) {
      throw new ForbiddenException(
        'Only the buyer can confirm an exchange token',
      );
    }

    // Mark the token as used
    await this.prisma.exchangeToken.update({
      where: { id: exchangeToken.id },
      data: { usedAt: new Date() },
    });

    // Create notifications for both parties
    const { conversationId, sellerId, buyerId, listingId } = exchangeToken;

    await this.prisma.notification.createMany({
      data: [
        {
          userId: sellerId,
          type: 'exchange_completed',
          title: 'Exchange completed',
          body: 'An item exchange was completed.',
          data: { conversationId, listingId },
        },
        {
          userId: buyerId,
          type: 'exchange_completed',
          title: 'Exchange completed',
          body: 'An item exchange was completed.',
          data: { conversationId, listingId },
        },
      ],
    });

    this.logger.log(
      `Exchange confirmed for conversation ${conversationId} by buyer ${requesterId}`,
    );

    return { conversationId, listingId };
  }
}

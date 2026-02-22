import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

// ─── Safety Warning Patterns ─────────────────────────────────

const OFFSITE_PAYMENT_PATTERNS = [
  /\bzelle\b/i,
  /\bcashapp\b/i,
  /\bcash\s*app\b/i,
  /\bvenmo\b/i,
  /\bwire\s*transfer\b/i,
  /\bwestern\s*union\b/i,
  /\bmoney\s*gram\b/i,
  /\bmoneygram\b/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\bgift\s*card\b/i,
];

const LINK_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/i;

/** Messages sent per user per conversation within rate limit window */
const MESSAGE_RATE_LIMIT = 30;
const MESSAGE_RATE_WINDOW_MS = 60 * 1000;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  /** In-memory rate limit counters. In production, use Redis. */
  private readonly messageCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Create a new conversation about a listing.
   * Prevents: buyer == seller, duplicate buyer+listing.
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<Record<string, unknown>> {
    // Validate listing exists and is active
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new BadRequestException('Cannot start a conversation on an inactive listing');
    }

    // Buyer cannot be the seller
    if (listing.userId === userId) {
      throw new BadRequestException('Cannot start a conversation on your own listing');
    }

    // Check for duplicate conversation
    const existing = await this.prisma.conversation.findUnique({
      where: {
        listingId_buyerId: {
          listingId: dto.listingId,
          buyerId: userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A conversation already exists for this listing');
    }

    // Create the conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        listingId: dto.listingId,
        buyerId: userId,
        sellerId: listing.userId,
        status: 'active',
        lastMessageAt: dto.message ? new Date() : null,
      },
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Send initial message if provided
    if (dto.message) {
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          body: dto.message,
          type: 'text',
        },
      });
    }

    return conversation;
  }

  /**
   * Send a message in a conversation.
   * Enforces rate limits, link blocking for low-trust users, and safety warnings.
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<{ message: Record<string, unknown>; safetyWarning: boolean }> {
    const conversation = await this.ensureParticipant(conversationId, userId);

    if (conversation.status === 'blocked') {
      throw new ForbiddenException('This conversation has been blocked');
    }

    // Rate limiting: max MESSAGE_RATE_LIMIT messages per minute per user per conversation
    this.enforceMessageRateLimit(userId, conversationId);

    // Check for links in messages from low-trust users (trust level < 2)
    // In a full implementation, trust level would come from the user record
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, phoneVerified: true },
    });

    if (sender) {
      const accountAgeDays =
        (Date.now() - new Date(sender.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const isLowTrust = !sender.phoneVerified || accountAgeDays < 7;

      if (isLowTrust && LINK_PATTERN.test(dto.content)) {
        throw new BadRequestException(
          'Links are not allowed until your account is established. Please verify your phone and wait a few days.',
        );
      }
    }

    // Detect off-site payment mentions
    const safetyWarning = OFFSITE_PAYMENT_PATTERNS.some((pattern) =>
      pattern.test(dto.content),
    );

    // Flag message if safety warning triggered
    const isFlagged = safetyWarning;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: dto.content,
        type: dto.messageType ?? 'text',
        isFlagged,
        metadata: safetyWarning ? { safetyWarning: 'offsite_payment_mention' } : undefined,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    // Update conversation last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Notify the other participant via push + in-app notification
    const recipientId =
      conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

    const truncatedBody =
      dto.content.length > 80 ? dto.content.slice(0, 77) + '...' : dto.content;

    await Promise.all([
      this.notificationQueue.add('send-push', {
        userId: recipientId,
        title: 'New message',
        body: truncatedBody,
        data: { conversationId, type: 'new_message' },
      }),
      this.prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'new_message',
          title: 'New message',
          body: truncatedBody,
          data: { conversationId },
        },
      }),
    ]);

    return { message, safetyWarning };
  }

  /**
   * Get a conversation with paginated messages.
   */
  async getConversation(
    userId: string,
    conversationId: string,
    pagination: PaginationDto,
  ): Promise<{ conversation: Record<string, unknown>; messages: Record<string, unknown>[]; total: number }> {
    const conversation = await this.ensureParticipant(conversationId, userId);

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    // Include listing and participant info
    const fullConversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        listing: { select: { id: true, title: true, price: true, status: true } },
        buyer: { select: { id: true, displayName: true, avatarUrl: true } },
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return {
      conversation: fullConversation as Record<string, unknown>,
      messages,
      total,
    };
  }

  /**
   * List user's conversations with last message preview, unread count, other user info.
   */
  async getConversations(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ conversations: Record<string, unknown>[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      status: { not: 'archived' as const },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              media: { select: { thumbnailUrl: true }, take: 1, orderBy: { position: 'asc' } },
            },
          },
          buyer: { select: { id: true, displayName: true, avatarUrl: true } },
          seller: { select: { id: true, displayName: true, avatarUrl: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, body: true, senderId: true, createdAt: true, type: true },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    // Compute unread counts for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const isBuyer = conv.buyerId === userId;
        const lastReadAt = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
          },
        });

        const otherUser = isBuyer ? conv.seller : conv.buyer;

        return {
          ...conv,
          unreadCount,
          otherUser,
          lastMessage: conv.messages[0] ?? null,
        };
      }),
    );

    return { conversations: enriched, total };
  }

  /**
   * Mark all unread messages in a conversation as read for the current user.
   */
  async markAsRead(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.ensureParticipant(conversationId, userId);
    const now = new Date();

    const isBuyer = conversation.buyerId === userId;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now },
    });
  }

  /**
   * Soft-delete a conversation for the current user (archive it).
   */
  async softDeleteConversation(userId: string, conversationId: string): Promise<void> {
    await this.ensureParticipant(conversationId, userId);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'archived' },
    });

    this.logger.log(`Conversation archived: id=${conversationId}, user=${userId}`);
  }

  /**
   * Block the other user in a conversation.
   */
  async blockUser(userId: string, conversationId: string): Promise<void> {
    await this.ensureParticipant(conversationId, userId);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'blocked', blockedById: userId },
    });

    this.logger.log(`User blocked in conversation: id=${conversationId}, blockedBy=${userId}`);
  }

  /**
   * Report a conversation. Delegates to the reports system.
   */
  async reportConversation(
    userId: string,
    conversationId: string,
    reason: string,
    description?: string,
  ): Promise<Record<string, unknown>> {
    await this.ensureParticipant(conversationId, userId);

    // Gather evidence: recent messages
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, body: true, senderId: true, createdAt: true },
    });

    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: 'message',
        targetId: conversationId,
        reason,
        details: description ?? null,
        evidence: { messages: messages.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId })) },
        status: 'pending',
        priority: 'normal',
      },
    });

    return report;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async ensureParticipant(
    conversationId: string,
    userId: string,
  ): Promise<{
    id: string;
    buyerId: string;
    sellerId: string;
    status: string;
    buyerLastReadAt: Date | null;
    sellerLastReadAt: Date | null;
  }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        buyerLastReadAt: true,
        sellerLastReadAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  /**
   * Enforce per-user per-conversation message rate limit.
   * Uses in-memory sliding window. In production, replace with Redis.
   */
  private enforceMessageRateLimit(userId: string, conversationId: string): void {
    const key = `${userId}:${conversationId}`;
    const now = Date.now();
    const entry = this.messageCounts.get(key);

    if (!entry || now > entry.resetAt) {
      this.messageCounts.set(key, { count: 1, resetAt: now + MESSAGE_RATE_WINDOW_MS });
      return;
    }

    entry.count += 1;
    if (entry.count > MESSAGE_RATE_LIMIT) {
      throw new BadRequestException(
        `Message rate limit exceeded. Maximum ${MESSAGE_RATE_LIMIT} messages per minute.`,
      );
    }
  }
}

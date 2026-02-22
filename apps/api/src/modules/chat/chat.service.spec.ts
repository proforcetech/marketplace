import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

const mockPrisma = {
  listing: {
    findUnique: jest.fn(),
  },
  conversation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  report: {
    create: jest.fn(),
  },
};

const mockNotificationQueue = {
  add: jest.fn().mockResolvedValue(undefined),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService(mockPrisma as never, mockNotificationQueue as never);
    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('throws NotFoundException when listing does not exist', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null);

      await expect(
        service.createConversation('user-1', { listingId: 'listing-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when listing is not active', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        userId: 'seller-1',
        title: 'Test',
        status: 'draft',
      });

      await expect(
        service.createConversation('user-1', { listingId: 'listing-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when buyer is the seller', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        userId: 'user-1',
        title: 'Test',
        status: 'active',
      });

      await expect(
        service.createConversation('user-1', { listingId: 'listing-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when conversation already exists', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        userId: 'seller-1',
        title: 'Test',
        status: 'active',
      });
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'existing-conv' });

      await expect(
        service.createConversation('buyer-1', { listingId: 'listing-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates conversation successfully', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        userId: 'seller-1',
        title: 'Test',
        status: 'active',
      });
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      const createdConv = {
        id: 'conv-1',
        listingId: 'listing-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        listing: { id: 'listing-1', title: 'Test' },
        buyer: { id: 'buyer-1', displayName: 'Buyer' },
        seller: { id: 'seller-1', displayName: 'Seller' },
      };
      mockPrisma.conversation.create.mockResolvedValue(createdConv);

      const result = await service.createConversation('buyer-1', { listingId: 'listing-1' });
      expect(result).toEqual(createdConv);
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            listingId: 'listing-1',
            buyerId: 'buyer-1',
            sellerId: 'seller-1',
          }),
        }),
      );
    });
  });

  describe('sendMessage', () => {
    const mockConversation = {
      id: 'conv-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      status: 'active',
      buyerLastReadAt: null,
      sellerLastReadAt: null,
    };

    it('throws ForbiddenException when conversation is blocked', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        ...mockConversation,
        status: 'blocked',
      });

      await expect(
        service.sendMessage('buyer-1', 'conv-1', { content: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('enqueues push notification after sending message', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days old
        phoneVerified: true,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        body: 'Hello',
        sender: { id: 'buyer-1', displayName: 'Buyer' },
      });
      mockPrisma.conversation.update.mockResolvedValue(mockConversation);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.sendMessage('buyer-1', 'conv-1', { content: 'Hello' });

      expect(mockNotificationQueue.add).toHaveBeenCalledWith(
        'send-push',
        expect.objectContaining({
          userId: 'seller-1', // recipient is seller when buyer sends
          title: 'New message',
        }),
      );
    });

    it('creates in-app notification after sending message', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        phoneVerified: true,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        body: 'Hello',
        sender: { id: 'buyer-1', displayName: 'Buyer' },
      });
      mockPrisma.conversation.update.mockResolvedValue(mockConversation);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.sendMessage('buyer-1', 'conv-1', { content: 'Hello' });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'seller-1',
            type: 'new_message',
          }),
        }),
      );
    });

    it('truncates long message body in notification', async () => {
      const longMessage = 'A'.repeat(100);
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConversation);
      mockPrisma.user.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        phoneVerified: true,
      });
      mockPrisma.message.create.mockResolvedValue({
        id: 'msg-1',
        body: longMessage,
        sender: { id: 'buyer-1', displayName: 'Buyer' },
      });
      mockPrisma.conversation.update.mockResolvedValue(mockConversation);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.sendMessage('buyer-1', 'conv-1', { content: longMessage });

      const queueCall = mockNotificationQueue.add.mock.calls[0];
      expect(queueCall[1].body).toHaveLength(80);
      expect(queueCall[1].body.endsWith('...')).toBe(true);
    });
  });
});

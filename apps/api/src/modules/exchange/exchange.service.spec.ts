import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ExchangeService } from './exchange.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  conversation: {
    findUnique: jest.fn(),
  },
  exchangeToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const CONVERSATION = {
  id: 'conv-1',
  sellerId: 'seller-1',
  buyerId: 'buyer-1',
  listingId: 'listing-1',
  listing: {},
  buyer: {},
  seller: {},
};

describe('ExchangeService', () => {
  let service: ExchangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<ExchangeService>(ExchangeService);
    jest.clearAllMocks();
  });

  describe('generateExchangeToken', () => {
    it('throws NotFoundException when conversation does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.generateExchangeToken('conv-missing', 'seller-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requester is not the seller', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(CONVERSATION);

      await expect(
        service.generateExchangeToken('conv-1', 'buyer-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns a signed token and expiresAt for the seller', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(CONVERSATION);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');
      mockPrisma.exchangeToken.create.mockResolvedValue({});

      const result = await service.generateExchangeToken('conv-1', 'seller-1');

      expect(result.token).toBe('signed-jwt-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      // expiry should be ~15 minutes from now
      const diffMs = result.expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
      expect(diffMs).toBeLessThan(16 * 60 * 1000);
    });

    it('persists the token in the database', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(CONVERSATION);
      mockJwtService.sign.mockReturnValue('signed-jwt-token');
      mockPrisma.exchangeToken.create.mockResolvedValue({});

      await service.generateExchangeToken('conv-1', 'seller-1');

      expect(mockPrisma.exchangeToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: 'signed-jwt-token',
            conversationId: 'conv-1',
            sellerId: 'seller-1',
            buyerId: 'buyer-1',
            listingId: 'listing-1',
          }),
        }),
      );
    });
  });

  describe('confirmExchange', () => {
    const STORED_TOKEN = {
      id: 'et-1',
      token: 'signed-jwt-token',
      conversationId: 'conv-1',
      sellerId: 'seller-1',
      buyerId: 'buyer-1',
      listingId: 'listing-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    };

    it('throws NotFoundException for an unknown token', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmExchange('bad-token', 'buyer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if token has already been used', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue({
        ...STORED_TOKEN,
        usedAt: new Date(),
      });

      await expect(
        service.confirmExchange('signed-jwt-token', 'buyer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if token is expired', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue({
        ...STORED_TOKEN,
        expiresAt: new Date(Date.now() - 1000), // already expired
      });
      // verify() succeeds (DB check happens first)
      mockJwtService.verify.mockReturnValue({});

      await expect(
        service.confirmExchange('signed-jwt-token', 'buyer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if JWT signature verification fails', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue(STORED_TOKEN);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(
        service.confirmExchange('signed-jwt-token', 'buyer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if requester is not the buyer', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue(STORED_TOKEN);
      mockJwtService.verify.mockReturnValue({});

      await expect(
        service.confirmExchange('signed-jwt-token', 'seller-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('marks the token as used and creates notifications for both parties', async () => {
      mockPrisma.exchangeToken.findUnique.mockResolvedValue(STORED_TOKEN);
      mockJwtService.verify.mockReturnValue({});
      mockPrisma.exchangeToken.update.mockResolvedValue({});
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.confirmExchange('signed-jwt-token', 'buyer-1');

      expect(mockPrisma.exchangeToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'et-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'seller-1' }),
            expect.objectContaining({ userId: 'buyer-1' }),
          ]),
        }),
      );

      expect(result).toEqual({ conversationId: 'conv-1', listingId: 'listing-1' });
    });
  });
});

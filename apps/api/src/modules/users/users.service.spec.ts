import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  listing: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  pushToken: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-key'),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(mockPrisma as never, mockConfigService as never);
    jest.clearAllMocks();
  });

  describe('registerPushToken', () => {
    it('upserts the push token', async () => {
      mockPrisma.pushToken.upsert.mockResolvedValue({});

      await service.registerPushToken('user-1', 'ExponentPushToken[abc]', 'ios');

      expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[abc]' },
        create: { token: 'ExponentPushToken[abc]', userId: 'user-1', platform: 'ios', isActive: true },
        update: { isActive: true, userId: 'user-1' },
      });
    });

    it('can re-activate a previously deactivated token', async () => {
      mockPrisma.pushToken.upsert.mockResolvedValue({ isActive: true });

      await service.registerPushToken('user-1', 'ExponentPushToken[xyz]', 'android');
      expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('removePushToken', () => {
    it('deactivates the token for the user', async () => {
      mockPrisma.pushToken.updateMany.mockResolvedValue({ count: 1 });

      await service.removePushToken('user-1', 'ExponentPushToken[abc]');

      expect(mockPrisma.pushToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'ExponentPushToken[abc]', userId: 'user-1' },
        data: { isActive: false },
      });
    });
  });

  describe('markAllNotificationsRead', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const count = await service.markAllNotificationsRead('user-1');

      expect(count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('markNotificationRead', () => {
    it('throws NotFoundException if notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markNotificationRead('user-1', 'notif-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if notification belongs to different user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
      });

      await expect(
        service.markNotificationRead('user-1', 'notif-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('marks the notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
      });
      mockPrisma.notification.update.mockResolvedValue({});

      await service.markNotificationRead('user-1', 'notif-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });
});

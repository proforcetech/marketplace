import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Expo } from 'expo-server-sdk';
import type { ExpoPushMessage } from 'expo-server-sdk';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Processes notification jobs (email, push).
 *
 * Push notifications use the Expo push service, which handles FCM (Android)
 * and APNs (iOS) delivery. Stale tokens (DeviceNotRegistered) are deactivated.
 *
 * Job queue: 'notifications'
 * Job types: 'send-email', 'send-push'
 */

interface SendEmailJobData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

interface SendPushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const expo = new Expo();

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<SendEmailJobData>): Promise<void> {
    const { to, template, data } = job.data;
    this.logger.log(`Sending email notification: to=${to}, template=${template}`);

    try {
      await this.emailService.send(to, template, data);
      this.logger.log(`Email notification sent: to=${to}, template=${template}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email: to=${to}, template=${template}, error=${errMsg}`);
      throw error;
    }
  }

  @Process('send-push')
  async handleSendPush(job: Job<SendPushJobData>): Promise<void> {
    const { userId, title, body, data } = job.data;
    this.logger.log(`Sending push notification: userId=${userId}, title="${title}"`);

    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId, isActive: true },
        select: { token: true },
      });

      if (tokens.length === 0) {
        this.logger.log(`No active push tokens for userId=${userId}`);
        return;
      }

      const messages: ExpoPushMessage[] = tokens
        .filter((t) => Expo.isExpoPushToken(t.token))
        .map((t) => ({
          to: t.token,
          title,
          body,
          data: data ?? {},
          sound: 'default' as const,
        }));

      if (messages.length === 0) {
        this.logger.warn(`No valid Expo push tokens for userId=${userId}`);
        return;
      }

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          if (!receipt) continue;

          if (receipt.status === 'error') {
            this.logger.warn(
              `Push delivery error: ${receipt.message}, details=${JSON.stringify(receipt.details)}`,
            );

            // Deactivate stale tokens
            if (receipt.details?.error === 'DeviceNotRegistered') {
              const staleToken = messages[i]?.to;
              if (staleToken && typeof staleToken === 'string') {
                await this.prisma.pushToken.updateMany({
                  where: { token: staleToken },
                  data: { isActive: false },
                });
                this.logger.log(`Deactivated stale push token: ${staleToken}`);
              }
            }
          }
        }
      }

      this.logger.log(
        `Push notifications sent: userId=${userId}, count=${messages.length}`,
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send push notifications: userId=${userId}, error=${errMsg}`);
      throw error;
    }
  }
}

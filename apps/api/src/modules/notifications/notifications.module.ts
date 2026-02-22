import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    EmailModule,
    PrismaModule,
  ],
  providers: [NotificationProcessor],
})
export class NotificationsModule {}

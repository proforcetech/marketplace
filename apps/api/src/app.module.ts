import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OffersModule } from './modules/offers/offers.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SavedSearchesModule } from './modules/saved-searches/saved-searches.module';
import { ExchangeModule } from './modules/exchange/exchange.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    // Config - global, loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 60000, limit: 100 },
      { name: 'long', ttl: 3600000, limit: 1000 },
    ]),

    // Cron jobs (promo expiration, listing expiry, etc.)
    ScheduleModule.forRoot(),

    // BullMQ / Redis queue root configuration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // Database
    PrismaModule,

    // Object storage (S3 / MinIO)
    StorageModule,

    // Cross-cutting infrastructure (global providers)
    LoggerModule,
    EmailModule,
    HealthModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ListingsModule,
    SearchModule,
    ChatModule,
    PaymentsModule,
    RatingsModule,
    AdminModule,
    ReportsModule,
    ModerationModule,
    NotificationsModule,
    OffersModule,
    SubscriptionsModule,
    SavedSearchesModule,
    ExchangeModule,
  ],
  providers: [
    // Global rate limiting guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

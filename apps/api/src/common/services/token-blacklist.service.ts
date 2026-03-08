import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TokenBlacklistService } from '../guards/auth.guard';

@Injectable()
export class RedisTokenBlacklistService
  implements TokenBlacklistService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisTokenBlacklistService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    } else {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
    } catch {
      this.logger.warn('Token blacklist Redis connection failed — blacklist checks will pass-through');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:jti:${jti}`);
      return result !== null;
    } catch {
      this.logger.warn(`Redis unavailable — treating jti=${jti} as not revoked`);
      return false;
    }
  }

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(`blacklist:jti:${jti}`, '1', 'EX', ttlSeconds);
    } catch {
      this.logger.error(`Failed to revoke jti=${jti}`);
    }
  }
}

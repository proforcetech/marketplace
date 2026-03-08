import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RateLimitStore } from '../guards/throttle.guard';

@Injectable()
export class RedisRateLimitStoreService
  implements RateLimitStore, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisRateLimitStoreService.name);
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
      this.logger.warn('Rate limit Redis connection failed — rate limiting will be disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  async increment(key: string, windowSeconds: number): Promise<number> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(`rl:${key}`);
      pipeline.expire(`rl:${key}`, windowSeconds, 'NX');
      const results = await pipeline.exec();
      const count = results?.[0]?.[1];
      return typeof count === 'number' ? count : 1;
    } catch {
      this.logger.warn(`Redis unavailable — skipping rate limit for key=${key}`);
      return 0;
    }
  }

  async getCount(key: string): Promise<number> {
    try {
      const val = await this.redis.get(`rl:${key}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(`rl:${key}`);
    } catch {
      return -2;
    }
  }
}

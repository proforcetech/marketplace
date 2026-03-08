import { Global, Module } from '@nestjs/common';
import { RedisTokenBlacklistService } from './services/token-blacklist.service';
import { RedisRateLimitStoreService } from './services/rate-limit-store.service';
import { TOKEN_BLACKLIST_SERVICE } from './guards/auth.guard';
import { RATE_LIMIT_STORE } from './guards/throttle.guard';

@Global()
@Module({
  providers: [
    RedisTokenBlacklistService,
    { provide: TOKEN_BLACKLIST_SERVICE, useExisting: RedisTokenBlacklistService },
    RedisRateLimitStoreService,
    { provide: RATE_LIMIT_STORE, useExisting: RedisRateLimitStoreService },
  ],
  exports: [
    TOKEN_BLACKLIST_SERVICE,
    RATE_LIMIT_STORE,
    RedisTokenBlacklistService,
    RedisRateLimitStoreService,
  ],
})
export class CommonModule {}

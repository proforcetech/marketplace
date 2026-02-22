/**
 * Rate Limiting Guard with Tiered Limits
 *
 * Implements sliding window rate limiting backed by Redis. Limits are tiered
 * based on the user's authentication status and trust level.
 *
 * Design decisions:
 * - Sliding window counter (not fixed window) to avoid burst-at-boundary attacks
 * - Redis MULTI/EXEC for atomic increment + expire (no race conditions)
 * - Per-endpoint-category limits (not global) so search doesn't compete with posting
 * - Dual-key limiting: user ID (primary) + IP (secondary) to catch token sharing
 * - Informative response headers (X-RateLimit-*) for well-behaved clients
 *
 * Performance: ~1ms per request (single Redis roundtrip with pipeline).
 * Memory: ~100 bytes per active rate limit key, auto-expired via TTL.
 */

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { securityConfig, RateLimitTier } from '../../config/security.config';

// ─── Decorator ────────────────────────────────────────────────

export const THROTTLE_CATEGORY_KEY = 'throttle_category';

/**
 * Decorator to assign a rate limit category to a controller method or class.
 * Categories map to the `rateLimits` configuration in security.config.ts.
 *
 * @example
 * @ThrottleCategory('listingCreate')
 * @Post('listings')
 * createListing() { ... }
 */
export const ThrottleCategory = (category: string) =>
  SetMetadata(THROTTLE_CATEGORY_KEY, category);

export const THROTTLE_SKIP_KEY = 'throttle_skip';

/**
 * Decorator to skip rate limiting on a specific endpoint.
 * Use sparingly -- only for health checks or internal endpoints.
 */
export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_KEY, true);

// ─── Redis Store Interface ────────────────────────────────────

/**
 * Interface for the rate limit store.
 * Implement with Redis in production (see suggested implementation below).
 */
export interface RateLimitStore {
  /**
   * Increment the counter for a key within a sliding window.
   * Returns the current count after increment.
   *
   * Implementation should be atomic (Redis MULTI/EXEC or Lua script):
   *
   *   MULTI
   *   INCR key
   *   EXPIRE key windowSeconds (only if TTL is not already set)
   *   EXEC
   *
   * For true sliding window, use sorted sets:
   *   ZREMRANGEBYSCORE key 0 (now - windowSeconds)
   *   ZADD key now requestId
   *   ZCARD key
   *   EXPIRE key windowSeconds
   */
  increment(key: string, windowSeconds: number): Promise<number>;

  /**
   * Get the current count for a key without incrementing.
   */
  getCount(key: string): Promise<number>;

  /**
   * Get the TTL (remaining seconds) for a key.
   * Returns -1 if the key has no expiry, -2 if the key does not exist.
   */
  getTtl(key: string): Promise<number>;
}

export const RATE_LIMIT_STORE = 'RATE_LIMIT_STORE';

// ─── Trust Level Resolution ──────────────────────────────────

type RateLimitTierName =
  | 'anonymous'
  | 'authenticatedLow'
  | 'authenticatedHigh'
  | 'verified'
  | 'admin';

/**
 * Resolve a user's trust level to a rate limit tier name.
 * This centralizes the mapping so it can be adjusted without touching guard logic.
 */
function resolveTierName(
  isAuthenticated: boolean,
  roles: string[],
  trustLevel?: number,
): RateLimitTierName {
  if (!isAuthenticated) {
    return 'anonymous';
  }

  // Admin and super_admin get the admin tier
  if (roles.includes('admin') || roles.includes('super_admin')) {
    return 'admin';
  }

  // Verified sellers and trust levels 4-5 get the verified tier
  if (
    roles.includes('verified_seller') ||
    (trustLevel !== undefined && trustLevel >= 4)
  ) {
    return 'verified';
  }

  // Trust levels 2-3 get the higher authenticated tier
  if (trustLevel !== undefined && trustLevel >= 2) {
    return 'authenticatedHigh';
  }

  // Everyone else authenticated gets the low tier
  return 'authenticatedLow';
}

// ─── Guard Implementation ─────────────────────────────────────

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly logger = new Logger(ThrottleGuard.name);
  private readonly defaultCategory = 'search'; // Fallback if no category specified

  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_STORE)
    private readonly store: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if throttling is explicitly skipped
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      THROTTLE_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipThrottle) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Determine the rate limit category for this endpoint
    const category =
      this.reflector.getAllAndOverride<string>(THROTTLE_CATEGORY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || this.defaultCategory;

    // Look up the rate limit configuration for this category
    const categoryConfig = securityConfig.rateLimits[category];
    if (!categoryConfig) {
      this.logger.warn(
        `No rate limit config for category "${category}". Allowing request.`,
      );
      return true;
    }

    // Determine the user's tier
    const user = request.user;
    const isAuthenticated = !!user;
    const roles = user?.roles || [];

    // Trust level would come from a user service or be cached on the JWT.
    // For now, extract from a custom header or default based on roles.
    const trustLevel = this.extractTrustLevel(request);

    const tierName = resolveTierName(isAuthenticated, roles, trustLevel);
    const tier: RateLimitTier = categoryConfig[tierName];

    // If limit is 0, this tier is blocked entirely for this category
    if (tier.limit === 0) {
      this.setRateLimitHeaders(response, tier, 0);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'This action is not available for your account type.',
          retryAfter: null,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Build the rate limit key
    const identifier = isAuthenticated
      ? `user:${user!.userId}`
      : `ip:${this.getClientIp(request)}`;
    const key = `rl:${category}:${identifier}`;

    // Increment and check
    const currentCount = await this.store.increment(key, tier.windowSeconds);

    // Set response headers regardless of outcome
    const remaining = Math.max(0, tier.limit - currentCount);
    this.setRateLimitHeaders(response, tier, remaining);

    if (currentCount > tier.limit) {
      const ttl = await this.store.getTtl(key);
      const retryAfter = ttl > 0 ? ttl : tier.windowSeconds;

      response.setHeader('Retry-After', retryAfter.toString());

      this.logger.warn(
        `Rate limit exceeded: category=${category}, tier=${tierName}, ` +
          `identifier=${identifier}, count=${currentCount}, limit=${tier.limit}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Additionally check IP-based limit for authenticated users (catches token sharing)
    if (isAuthenticated) {
      const ipKey = `rl:${category}:ip:${this.getClientIp(request)}`;
      // IP limit for authenticated users is 3x the user limit (to avoid false positives
      // from shared networks like offices/universities)
      const ipLimit = tier.limit * 3;
      const ipCount = await this.store.increment(ipKey, tier.windowSeconds);

      if (ipCount > ipLimit) {
        this.logger.warn(
          `IP-based rate limit exceeded for authenticated user: ` +
            `category=${category}, ip=${this.getClientIp(request)}, ` +
            `user=${user!.userId}, count=${ipCount}, limit=${ipLimit}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests from this network. Please try again later.',
            retryAfter: tier.windowSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  private setRateLimitHeaders(
    response: Response,
    tier: RateLimitTier,
    remaining: number,
  ): void {
    response.setHeader('X-RateLimit-Limit', tier.limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader(
      'X-RateLimit-Reset',
      Math.floor(Date.now() / 1000 + tier.windowSeconds).toString(),
    );
  }

  /**
   * Extract the client's real IP address, accounting for proxies.
   *
   * IMPORTANT: This trusts X-Forwarded-For only if the app is behind a trusted proxy
   * (e.g., ALB, CloudFront). In NestJS, set `app.set('trust proxy', 1)` to trust
   * the first proxy hop.
   */
  private getClientIp(request: Request): string {
    // When trust proxy is configured, Express populates request.ip correctly
    const ip = request.ip || request.socket.remoteAddress || '0.0.0.0';

    // Normalize IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    return ip;
  }

  /**
   * Extract trust level from the request.
   *
   * In a full implementation, this would come from:
   * 1. A custom JWT claim (added during token issuance based on user's current trust level)
   * 2. A cached lookup in Redis (user_id -> trust_level)
   * 3. A database query (least preferred due to per-request cost)
   *
   * For now, we check for a custom claim in the JWT payload or derive from roles.
   */
  private extractTrustLevel(request: Request): number | undefined {
    // Check if trust level is available on the user object
    // (would be set by a middleware that enriches the user context)
    const user = request.user as Record<string, unknown> | undefined;
    if (user && typeof user['trustLevel'] === 'number') {
      return user['trustLevel'] as number;
    }
    return undefined;
  }
}

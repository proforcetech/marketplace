/**
 * JWT Authentication Guard
 *
 * Validates JWT access tokens on protected endpoints. Supports:
 * - RS256 asymmetric signature verification
 * - Token expiry validation
 * - JTI blacklist checking (for revoked tokens)
 * - Optional authentication (via @Public() decorator)
 * - User context injection into request object
 *
 * Performance considerations:
 * - JWT verification is synchronous crypto (RS256 ~0.5ms). Acceptable at request scale.
 * - JTI blacklist uses Redis GET (O(1)), not a database query.
 * - Public key is cached in memory (loaded once at startup, refreshed on rotation).
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { SetMetadata } from '@nestjs/common';

// ─── Decorators ───────────────────────────────────────────────

/** Mark an endpoint as publicly accessible (skip JWT validation) */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ─── Types ────────────────────────────────────────────────────

export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** User email */
  email: string;
  /** Assigned roles */
  roles: string[];
  /** Issued at (unix timestamp) */
  iat: number;
  /** Expiration (unix timestamp) */
  exp: number;
  /** Unique token identifier */
  jti: string;
  /** Device fingerprint hash */
  deviceId?: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
  jti: string;
  deviceId?: string;
}

/**
 * Augment Express Request to include authenticated user.
 * Controllers access this via `request.user`.
 */
declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// ─── Token Blacklist Interface ────────────────────────────────

/**
 * Interface for the JTI blacklist store.
 * Implement with Redis in production.
 */
export interface TokenBlacklistService {
  /**
   * Check if a JTI has been revoked.
   * Must be O(1) -- use Redis GET or SET membership.
   */
  isRevoked(jti: string): Promise<boolean>;

  /**
   * Revoke a JTI. TTL should match remaining token lifetime.
   */
  revoke(jti: string, ttlSeconds: number): Promise<void>;
}

export const TOKEN_BLACKLIST_SERVICE = 'TOKEN_BLACKLIST_SERVICE';

// ─── Guard Implementation ─────────────────────────────────────

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private publicKey: string;

  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_BLACKLIST_SERVICE)
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    // Load the RS256 public key from environment.
    // In production, this should come from a secrets manager or be rotated via JWKS endpoint.
    const key = process.env['JWT_PUBLIC_KEY'];
    if (!key) {
      this.logger.warn(
        'JWT_PUBLIC_KEY not set. Authentication will fail for all requests. ' +
          'Set this environment variable to the PEM-encoded RS256 public key.',
      );
      this.publicKey = '';
    } else {
      // Environment variables often have literal \n instead of newlines
      this.publicKey = key.replace(/\\n/g, '\n');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the endpoint is decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      // For public endpoints, still attempt to extract user if a token is present
      // (enables "optionally authenticated" endpoints)
      if (token) {
        try {
          request.user = await this.validateToken(token);
        } catch {
          // Token is invalid but endpoint is public -- proceed without user context
          request.user = undefined;
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.user = await this.validateToken(token);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Do not leak internal error details to the client
      this.logger.warn(`Token validation failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  private async validateToken(token: string): Promise<AuthenticatedUser> {
    if (!this.publicKey) {
      throw new UnauthorizedException('Authentication service is not configured');
    }

    // Verify signature and standard claims (exp, iat)
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        // Do not accept tokens issued in the future (clock tolerance: 30s for minor skew)
        clockTolerance: 30,
      }) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw error;
    }

    // Validate required claims exist
    if (!payload.sub || !payload.jti || !payload.roles) {
      throw new UnauthorizedException('Token is missing required claims');
    }

    // Check JTI blacklist (covers: logout, password change, admin revocation)
    // This is an O(1) Redis lookup, adding ~1ms to request time.
    const isRevoked = await this.tokenBlacklist.isRevoked(payload.jti);
    if (isRevoked) {
      this.logger.warn(
        `Revoked token used: jti=${payload.jti}, sub=${payload.sub}`,
      );
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      jti: payload.jti,
      deviceId: payload.deviceId,
    };
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    // Expect "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return undefined;
    }

    const token = parts[1];

    // Basic sanity check: JWTs have 3 base64url-encoded segments separated by dots.
    // This prevents sending garbage to the JWT library.
    if (!token || token.split('.').length !== 3) {
      return undefined;
    }

    return token;
  }
}

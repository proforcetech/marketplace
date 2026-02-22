import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

/**
 * Passport strategy for validating JWT refresh tokens.
 *
 * Extracts the refresh token from the httpOnly cookie or request body,
 * and validates its signature. The actual refresh token rotation and
 * reuse detection is handled in the AuthService.
 *
 * Registered under the name 'jwt-refresh'.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error('JWT_PUBLIC_KEY environment variable is not set.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from httpOnly cookie
        (request: Request) => {
          const cookie = request?.cookies?.['refresh_token'];
          if (typeof cookie === 'string' && cookie.length > 0) {
            return cookie;
          }
          return null;
        },
        // Fallback: extract from request body (mobile clients)
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  /**
   * Called after JWT verification. Attaches the raw token to the return value
   * so AuthService can hash it and look up the session.
   */
  validate(
    request: Request,
    payload: RefreshTokenPayload,
  ): { userId: string; refreshToken: string } {
    if (!payload.sub || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Extract the raw refresh token for session lookup
    const refreshToken =
      request?.cookies?.['refresh_token'] || request?.body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return {
      userId: payload.sub,
      refreshToken: refreshToken as string,
    };
  }
}

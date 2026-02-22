import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '../../../common/guards/auth.guard';

/**
 * Passport strategy for validating JWT access tokens.
 *
 * Extracts the JWT from the Authorization header, verifies the signature
 * using the RS256 public key, and returns the authenticated user payload.
 *
 * This strategy is registered under the default name 'jwt' and is used
 * by the AuthGuard('jwt') guard.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error(
        'JWT_PUBLIC_KEY environment variable is not set. ' +
          'Set this to the PEM-encoded RS256 public key.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey.replace(/\\n/g, '\n'),
      algorithms: ['RS256'],
    });
  }

  /**
   * Called by Passport after successful JWT verification.
   * The returned value is attached to request.user.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Token is missing required claims');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      jti: payload.jti,
      deviceId: payload.deviceId,
    };
  }
}

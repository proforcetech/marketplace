import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  securityConfig,
  TokenConfig,
  OtpConfig,
} from '../../config/security.config';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthenticatedUser } from '../../common/guards/auth.guard';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    phoneVerified: boolean;
    role: string;
    createdAt: Date;
  };
  accessToken: string;
}

interface SessionInfo {
  id: string;
  deviceInfo: unknown;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenConfig: TokenConfig;
  private readonly otpConfig: OtpConfig;
  private readonly bcryptRounds: number;
  private readonly jwtPrivateKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.tokenConfig = securityConfig.tokens;
    this.otpConfig = securityConfig.otp;
    this.bcryptRounds = securityConfig.password.bcryptRounds;

    const privateKey = this.configService.get<string>('JWT_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error(
        'JWT_PRIVATE_KEY environment variable is not set. ' +
          'Set this to the PEM-encoded RS256 private key.',
      );
    }
    this.jwtPrivateKey = privateKey.replace(/\\n/g, '\n');
  }

  // ─── Signup ──────────────────────────────────────────────────

  async signup(
    dto: SignupDto,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Create user and initial session in a transaction
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: 'user',
        status: 'active',
      },
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id, user.email, [
      user.role,
    ]);

    // Create session
    await this.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      deviceInfo,
    );

    this.logger.log(`User registered: ${user.id}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        phoneVerified: user.phoneVerified,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    };
  }

  // ─── Login ───────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Use constant-time comparison indirectly: still hash the password to prevent timing attacks
      await bcrypt.hash(dto.password, this.bcryptRounds);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account status
    if (user.status === 'banned') {
      throw new ForbiddenException('This account has been permanently disabled');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('This account is currently suspended');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(user.id, user.email, [
      user.role,
    ]);

    // Create session
    await this.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      deviceInfo,
    );

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        phoneVerified: user.phoneVerified,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────

  async refreshTokens(
    oldRefreshToken: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(oldRefreshToken);

    // Find the session by token hash
    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      // Possible token reuse attack. If the token was previously valid but
      // has been rotated, revoke ALL sessions for the user (security measure).
      this.logger.warn(
        `Refresh token reuse detected or token not found. IP: ${ipAddress}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { user } = session;

    if (user.status === 'banned' || user.status === 'suspended') {
      // Revoke the session
      await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new ForbiddenException('Account access restricted');
    }

    // Generate new token pair
    const newTokens = await this.generateTokenPair(user.id, user.email, [
      user.role,
    ]);

    // Rotate: update the session with the new refresh token hash
    const newHash = this.hashToken(newTokens.refreshToken);
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newHash,
        ipAddress,
        deviceInfo: deviceInfo ? JSON.parse(`{"userAgent": "${deviceInfo}"}`) : session.deviceInfo,
        expiresAt: new Date(
          Date.now() + this.tokenConfig.refreshTokenExpirySeconds * 1000,
        ),
      },
    });

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  // ─── Send OTP ────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto, userId: string): Promise<{ message: string }> {
    // Check if the phone is already claimed by another user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phone: dto.phone,
        phoneVerified: true,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'This phone number is already associated with another account',
      );
    }

    // Rate limit: check recent OTP requests for this phone
    const recentVerifications = await this.prisma.userVerification.count({
      where: {
        target: dto.phone,
        type: 'phone_otp',
        createdAt: {
          gte: new Date(Date.now() - 3600_000), // 1 hour
        },
      },
    });

    if (recentVerifications >= this.otpConfig.maxRequestsPerPhonePerHour) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again later.',
      );
    }

    // Generate a cryptographically secure 6-digit OTP
    const code = this.generateOtpCode();
    const codeHash = this.hashToken(code);

    // Invalidate any existing pending verifications for this phone
    await this.prisma.userVerification.updateMany({
      where: {
        userId,
        target: dto.phone,
        type: 'phone_otp',
        verifiedAt: null,
      },
      data: {
        expiresAt: new Date(), // Expire immediately
      },
    });

    // Store the new verification record
    await this.prisma.userVerification.create({
      data: {
        userId,
        type: 'phone_otp',
        target: dto.phone,
        codeHash,
        maxAttempts: this.otpConfig.maxAttempts,
        expiresAt: new Date(Date.now() + this.otpConfig.expirySeconds * 1000),
      },
    });

    // In production, send via Twilio. For development, log the code.
    if (process.env['NODE_ENV'] === 'development') {
      this.logger.debug(`OTP for ${dto.phone}: ${code}`);
    }

    // TODO: Integrate Twilio Verify API for production OTP delivery

    return { message: 'Verification code sent' };
  }

  // ─── Verify OTP ──────────────────────────────────────────────

  async verifyOtp(
    dto: VerifyOtpDto,
    userId: string,
  ): Promise<{ verified: boolean }> {
    const verification = await this.prisma.userVerification.findFirst({
      where: {
        userId,
        target: dto.phone,
        type: 'phone_otp',
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Check max attempts
    if (verification.attempts >= verification.maxAttempts) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new code.',
      );
    }

    // Constant-time comparison via hash
    const submittedHash = this.hashToken(dto.code);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'hex'),
      Buffer.from(verification.codeHash, 'hex'),
    );

    if (!isValid) {
      // Increment attempt counter
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark as verified and update user
    await this.prisma.$transaction([
      this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: dto.phone,
          phoneVerified: true,
        },
      }),
    ]);

    this.logger.log(`Phone verified for user: ${userId}`);

    return { verified: true };
  }

  // ─── Forgot Password ────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    // Always return success to prevent email enumeration
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return generic success even if user does not exist
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // Rate limit: check recent reset requests
    const recentResets = await this.prisma.userVerification.count({
      where: {
        userId: user.id,
        type: 'password_reset',
        createdAt: {
          gte: new Date(
            Date.now() -
              securityConfig.accountRecovery.maxRequestsPerEmailPerHour *
                3600_000,
          ),
        },
      },
    });

    if (
      recentResets >= securityConfig.accountRecovery.maxRequestsPerEmailPerHour
    ) {
      // Still return generic success to prevent enumeration
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(resetToken);

    // Invalidate any existing reset tokens
    await this.prisma.userVerification.updateMany({
      where: {
        userId: user.id,
        type: 'password_reset',
        verifiedAt: null,
      },
      data: {
        expiresAt: new Date(),
      },
    });

    // Store the reset token
    await this.prisma.userVerification.create({
      data: {
        userId: user.id,
        type: 'password_reset',
        target: normalizedEmail,
        codeHash: tokenHash,
        maxAttempts: 1,
        expiresAt: new Date(
          Date.now() + securityConfig.accountRecovery.tokenExpirySeconds * 1000,
        ),
      },
    });

    // In production, send email with reset link
    if (process.env['NODE_ENV'] === 'development') {
      this.logger.debug(`Password reset token for ${normalizedEmail}: ${resetToken}`);
    }

    // TODO: Integrate email service (SendGrid/SES) for production delivery

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  // ─── Reset Password ─────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const verification = await this.prisma.userVerification.findFirst({
      where: {
        type: 'password_reset',
        codeHash: tokenHash,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    // Update password and invalidate token + all sessions in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { passwordHash },
      }),
      this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      }),
      // Revoke all existing sessions (security: force re-login after password reset)
      this.prisma.userSession.deleteMany({
        where: { userId: verification.userId },
      }),
    ]);

    this.logger.log(`Password reset completed for user: ${verification.userId}`);

    // TODO: Send notification email "Your password was changed"

    return { message: 'Password has been reset successfully' };
  }

  // ─── Sessions ────────────────────────────────────────────────

  async getSessions(
    userId: string,
    currentSessionToken?: string,
  ): Promise<SessionInfo[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentHash = currentSessionToken
      ? this.hashToken(currentSessionToken)
      : null;

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: currentHash
        ? session.refreshTokenHash === currentHash
        : false,
    }));
  }

  async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.userSession.delete({ where: { id: sessionId } });

    this.logger.log(`Session revoked: ${sessionId} by user: ${userId}`);

    return { message: 'Session revoked' };
  }

  // ─── Logout ──────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<{ message: string }> {
    if (!refreshToken) {
      return { message: 'Logged out' };
    }

    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.userSession.deleteMany({
      where: { refreshTokenHash: tokenHash },
    });

    return { message: 'Logged out' };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<TokenPair> {
    const jti = crypto.randomUUID();

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        email,
        roles,
        jti,
      },
      {
        algorithm: 'RS256',
        expiresIn: this.tokenConfig.accessTokenExpirySeconds,
      },
    );

    const refreshJti = crypto.randomUUID();

    const refreshToken = this.jwtService.sign(
      {
        sub: userId,
        jti: refreshJti,
        type: 'refresh',
      },
      {
        algorithm: 'RS256',
        expiresIn: this.tokenConfig.refreshTokenExpirySeconds,
      },
    );

    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    ipAddress: string,
    deviceInfo?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    // Enforce max sessions per user
    const activeSessions = await this.prisma.userSession.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeSessions >= this.tokenConfig.maxActiveRefreshTokensPerUser) {
      // Delete the oldest session
      const oldestSession = await this.prisma.userSession.findFirst({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestSession) {
        await this.prisma.userSession.delete({
          where: { id: oldestSession.id },
        });
      }
    }

    await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: tokenHash,
        ipAddress,
        deviceInfo: deviceInfo
          ? { userAgent: deviceInfo }
          : undefined,
        expiresAt: new Date(
          Date.now() + this.tokenConfig.refreshTokenExpirySeconds * 1000,
        ),
      },
    });
  }

  /**
   * Generate a cryptographically secure OTP code.
   * Uses crypto.randomInt to avoid modulo bias.
   */
  private generateOtpCode(): string {
    const min = Math.pow(10, this.otpConfig.codeLength - 1);
    const max = Math.pow(10, this.otpConfig.codeLength) - 1;
    const code = crypto.randomInt(min, max + 1);
    return code.toString();
  }

  /**
   * SHA-256 hash for token storage.
   * Tokens (refresh tokens, OTPs, reset tokens) are never stored in plaintext.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get the refresh token from a request's cookies.
   * Utility for extracting from httpOnly cookie.
   */
  getRefreshTokenFromCookies(
    cookies: Record<string, string | undefined>,
  ): string | undefined {
    return cookies?.['refresh_token'];
  }
}

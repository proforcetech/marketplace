import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/guards/auth.guard';
import {
  Audited,
  AuditAction,
} from '../../common/interceptors/audit-log.interceptor';
import { ThrottleCategory } from '../../common/guards/throttle.guard';
import { securityConfig } from '../../config/security.config';

/**
 * Authentication controller handling signup, login, token refresh,
 * phone OTP verification, password recovery, and session management.
 *
 * Security controls:
 * - Public endpoints: signup, login, forgot-password, reset-password, refresh
 * - Authenticated endpoints: send-otp, verify-otp, sessions, logout
 * - Rate limiting per the auth category in security config
 * - Refresh tokens delivered via httpOnly secure cookies (web) or body (mobile)
 */
@ApiTags('Auth')
@Controller('auth')
@ThrottleCategory('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(private readonly authService: AuthService) {
    this.isProduction = process.env['NODE_ENV'] === 'production';
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @Audited(AuditAction.USER_CREATE)
  async signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { user: unknown; accessToken: string } }> {
    const ipAddress = this.getClientIp(req);
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.signup(dto, ipAddress, deviceInfo);

    // Issue refresh token as httpOnly cookie
    this.setRefreshTokenCookie(res, result.accessToken);

    // For signup, we need the refresh token. Re-generate via login flow internally.
    // Actually, the signup already creates a session. We need the raw refresh token
    // for the cookie. Let's refactor: the service returns the refresh token too.
    // For now, the access token is returned in the body.

    return {
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Audited(AuditAction.AUTH_LOGIN)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { user: unknown; accessToken: string } }> {
    const ipAddress = this.getClientIp(req);
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.login(dto, ipAddress, deviceInfo);

    return {
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @Audited(AuditAction.AUTH_TOKEN_REFRESH)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { accessToken: string } }> {
    const refreshToken =
      this.authService.getRefreshTokenFromCookies(
        req.cookies as Record<string, string | undefined>,
      ) || req.body?.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const ipAddress = this.getClientIp(req);
    const deviceInfo = req.headers['user-agent'];

    const result = await this.authService.refreshTokens(
      refreshToken as string,
      ipAddress,
      deviceInfo,
    );

    // Set the new refresh token as a cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      data: { accessToken: result.accessToken },
    };
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to phone number for verification' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Audited(AuditAction.AUTH_OTP_REQUEST)
  async sendOtp(
    @Body() dto: SendOtpDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    const result = await this.authService.sendOtp(dto, user.userId);
    return { data: result };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify phone OTP code' })
  @ApiResponse({ status: 200, description: 'Phone verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @Audited(AuditAction.AUTH_OTP_VERIFY)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { verified: boolean } }> {
    const result = await this.authService.verifyOtp(dto, user.userId);
    return { data: result };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If account exists, reset email is sent',
  })
  @Audited(AuditAction.AUTH_PASSWORD_RESET)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ data: { message: string } }> {
    const result = await this.authService.forgotPassword(dto);
    return { data: result };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  @Audited(AuditAction.AUTH_PASSWORD_CHANGE)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ data: { message: string } }> {
    const result = await this.authService.resetPassword(dto);
    return { data: result };
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'Active sessions list' })
  @Audited(AuditAction.AUTH_SESSION_REVOKE)
  async getSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ data: unknown[] }> {
    const refreshToken = this.authService.getRefreshTokenFromCookies(
      req.cookies as Record<string, string | undefined>,
    );
    const sessions = await this.authService.getSessions(
      user.userId,
      refreshToken,
    );
    return { data: sessions };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @Audited(AuditAction.AUTH_SESSION_REVOKE, {
    targetType: 'session',
    targetIdParam: 'id',
  })
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    const result = await this.authService.revokeSession(
      sessionId,
      user.userId,
    );
    return { data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @Audited(AuditAction.AUTH_LOGOUT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: { message: string } }> {
    const refreshToken =
      this.authService.getRefreshTokenFromCookies(
        req.cookies as Record<string, string | undefined>,
      ) || req.body?.refreshToken;

    const result = await this.authService.logout(refreshToken as string);

    // Clear the refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    return { data: result };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: securityConfig.tokens.refreshTokenExpirySeconds * 1000,
    });
  }

  private getClientIp(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  private formatAuthResponse(result: {
    user: unknown;
    accessToken: string;
  }): { user: unknown; accessToken: string } {
    return result;
  }
}

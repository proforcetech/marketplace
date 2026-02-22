import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterPushTokenDto, RemovePushTokenDto } from './dto/push-token.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> }> {
    const profile = await this.usersService.getMyProfile(user.userId);
    return { data: profile };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    return { data: updated };
  }

  @Get('me/notifications')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<{
    data: { notifications: Record<string, unknown>[]; unreadCount: number };
    pagination: { total: number; page: number; limit: number };
  }> {
    const result = await this.usersService.getNotifications(user.userId, query);
    return {
      data: { notifications: result.notifications, unreadCount: result.unreadCount },
      pagination: { total: result.total, page: query.page ?? 1, limit: query.limit ?? 20 },
    };
  }

  @Patch('me/notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { updated: number } }> {
    const count = await this.usersService.markAllNotificationsRead(user.userId);
    return { data: { updated: count } };
  }

  @Patch('me/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.usersService.markNotificationRead(user.userId, id);
    return { data: { message: 'Notification marked as read' } };
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate presigned URL for avatar upload' })
  @ApiResponse({ status: 200, description: 'Upload URL generated' })
  async getAvatarUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { uploadUrl: string; avatarUrl: string } }> {
    const result = await this.usersService.generateAvatarUploadUrl(user.userId);
    return { data: result };
  }

  @Post('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register device push token' })
  @ApiResponse({ status: 204, description: 'Token registered' })
  async registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    await this.usersService.registerPushToken(user.userId, dto.token, dto.platform);
  }

  @Delete('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate device push token' })
  @ApiResponse({ status: 204, description: 'Token deactivated' })
  async removePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemovePushTokenDto,
  ): Promise<void> {
    await this.usersService.removePushToken(user.userId, dto.token);
  }

  @Post('me/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate Stripe Identity verification' })
  @ApiResponse({ status: 200, description: 'Verification session URL' })
  async initiateVerification(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { url: string } }> {
    const result = await this.usersService.initiateIdentityVerification(user.userId);
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(
    @Param('id') id: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const profile = await this.usersService.getPublicProfile(id);
    return { data: profile };
  }

  @Get(':id/listings')
  @ApiOperation({ summary: "Get user's active listings" })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: "User's active listings" })
  async getUserListings(
    @Param('id') id: string,
    @Query() query: PaginationDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { listings, total } = await this.usersService.getUserListings(id, query);
    return {
      data: listings,
      pagination: { total, page: query.page ?? 1, limit: query.limit ?? 20 },
    };
  }
}

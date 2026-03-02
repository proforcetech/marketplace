import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles, Role } from '../../common/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { AdminService } from './admin.service';
import { ModerationActionDto } from './dto/moderation-action.dto';
import { UserActionDto } from './dto/user-action.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { AdminUserQueryDto, AdminReportQueryDto, AuditLogQueryDto } from './dto/admin-query.dto';

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboard(): Promise<{ data: Record<string, number> }> {
    const stats = await this.adminService.getDashboardStats();
    return { data: stats };
  }

  // ─── Moderation Queue ──────────────────────────────────────

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Get listings pending review' })
  @ApiResponse({ status: 200, description: 'Moderation queue' })
  async getModerationQueue(
    @Query() query: AdminUserQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { listings, total } = await this.adminService.getModerationQueue(page, limit);
    return { data: listings, pagination: { total, page, limit } };
  }

  @Post('moderation/:listingId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a listing' })
  @ApiParam({ name: 'listingId' })
  @ApiResponse({ status: 200, description: 'Listing approved' })
  async approveListing(
    @Param('listingId') listingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.approveListing(listingId, user.userId);
    return { data: { message: 'Listing approved' } };
  }

  @Post('moderation/:listingId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a listing' })
  @ApiParam({ name: 'listingId' })
  @ApiResponse({ status: 200, description: 'Listing rejected' })
  async rejectListing(
    @Param('listingId') listingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ModerationActionDto,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.rejectListing(listingId, user.userId, dto.reason);
    return { data: { message: 'Listing rejected' } };
  }

  @Post('moderation/:listingId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a listing' })
  @ApiParam({ name: 'listingId' })
  @ApiResponse({ status: 200, description: 'Listing removed' })
  async removeListing(
    @Param('listingId') listingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ModerationActionDto,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.removeListing(listingId, user.userId, dto.reason);
    return { data: { message: 'Listing removed' } };
  }

  // ─── User Management ──────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Search and list users' })
  @ApiResponse({ status: 200, description: 'User list' })
  async searchUsers(
    @Query() query: AdminUserQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { users, total } = await this.adminService.searchUsers(query);
    return { data: users, pagination: { total, page: query.page ?? 1, limit: query.limit ?? 20 } };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user detail' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetail(
    @Param('id') id: string,
  ): Promise<{ data: Record<string, unknown> }> {
    const user = await this.adminService.getUserDetail(id);
    return { data: user };
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban a user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'User banned' })
  async banUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UserActionDto,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.banUser(id, admin.userId, dto.reason);
    return { data: { message: 'User banned' } };
  }

  @Post('users/:id/shadow-ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shadow-ban a user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'User shadow-banned' })
  async shadowBanUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UserActionDto,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.shadowBanUser(id, admin.userId, dto.reason);
    return { data: { message: 'User shadow-banned' } };
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user for N days' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'User suspended' })
  async suspendUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UserActionDto,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.suspendUser(id, admin.userId, dto.reason, dto.days ?? 7);
    return { data: { message: `User suspended for ${dto.days ?? 7} days` } };
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift a user suspension or ban' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'User unsuspended' })
  async unsuspendUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.adminService.unsuspendUser(id, admin.userId);
    return { data: { message: 'User unsuspended' } };
  }

  // ─── Reports ──────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'Get reports queue' })
  @ApiResponse({ status: 200, description: 'Reports list' })
  async getReports(
    @Query() query: AdminReportQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { reports, total } = await this.adminService.getReports(query);
    return { data: reports, pagination: { total, page: query.page ?? 1, limit: query.limit ?? 20 } };
  }

  @Patch('reports/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve or dismiss a report' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async resolveReport(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ResolveReportDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const report = await this.adminService.resolveReport(id, admin.userId, dto.status, dto.notes);
    return { data: report };
  }

  // ─── Audit Log ────────────────────────────────────────────

  @Get('audit-log')
  @ApiOperation({ summary: 'Get searchable audit log' })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getAuditLog(
    @Query() query: AuditLogQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { logs, total } = await this.adminService.getAuditLog(query);
    return { data: logs, pagination: { total, page: query.page ?? 1, limit: query.limit ?? 20 } };
  }
}

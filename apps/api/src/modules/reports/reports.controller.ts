import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a report' })
  @ApiResponse({ status: 201, description: 'Report submitted' })
  @ApiResponse({ status: 404, description: 'Target not found' })
  @ApiResponse({ status: 409, description: 'Duplicate report' })
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const report = await this.reportsService.createReport(user.userId, dto);
    return { data: report };
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's submitted reports" })
  @ApiResponse({ status: 200, description: "User's reports" })
  async getMyReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { reports, total } = await this.reportsService.getMyReports(user.userId, query);
    return {
      data: reports,
      pagination: { total, page: query.page ?? 1, limit: query.limit ?? 20 },
    };
  }
}

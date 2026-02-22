import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard, Public } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ThrottleGuard, ThrottleCategory } from '../../common/guards/throttle.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { ListingsService } from './listings.service';
import {
  CreateListingDto,
  UpdateListingDto,
  ListingStatusDto,
  ListingQueryDto,
} from './dto';

@ApiTags('Listings')
@Controller('api/v1/listings')
@UseGuards(AuthGuard, RolesGuard, ThrottleGuard)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ThrottleCategory('listingCreate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const listing = await this.listingsService.create(user.userId, dto);
    return { data: listing };
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's listings" })
  @ApiResponse({ status: 200, description: 'User listings retrieved' })
  async getMyListings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListingQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { listings, total } = await this.listingsService.findMyListings(
      user.userId,
      query,
    );
    return {
      data: listings,
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get listing details' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing details' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<{ data: Record<string, unknown> }> {
    const listing = await this.listingsService.findById(id, user?.userId);
    return { data: listing };
  }

  @Patch(':id')
  @ThrottleCategory('listingUpdate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing updated' })
  @ApiResponse({ status: 403, description: 'Not the listing owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateListingDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const listing = await this.listingsService.update(id, user.userId, dto);
    return { data: listing };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 204, description: 'Listing deleted' })
  @ApiResponse({ status: 403, description: 'Not the listing owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.listingsService.softDelete(id, user.userId);
  }

  @Post(':id/media')
  @ThrottleCategory('mediaUpload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate presigned URL for media upload' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiConsumes('application/json')
  @ApiResponse({ status: 201, description: 'Presigned URL generated' })
  @ApiResponse({ status: 400, description: 'Unsupported file type' })
  @HttpCode(HttpStatus.CREATED)
  async uploadMedia(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('contentType') contentType: string,
  ): Promise<{ data: { uploadUrl: string; fileKey: string; mediaId: string } }> {
    const result = await this.listingsService.generateMediaUploadUrl(
      id,
      user.userId,
      contentType,
    );
    return { data: result };
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove media from a listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiParam({ name: 'mediaId', description: 'Media ID' })
  @ApiResponse({ status: 204, description: 'Media removed' })
  async removeMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.listingsService.removeMedia(id, mediaId, user.userId);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change listing status' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 409, description: 'Invalid status transition' })
  async changeStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ListingStatusDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const listing = await this.listingsService.changeStatus(
      id,
      user.userId,
      dto.status,
    );
    return { data: listing };
  }

  @Post(':id/renew')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew an expired listing' })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing renewed' })
  @ApiResponse({ status: 409, description: 'Listing is not expired' })
  async renew(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> }> {
    const listing = await this.listingsService.renew(id, user.userId);
    return { data: listing };
  }
}

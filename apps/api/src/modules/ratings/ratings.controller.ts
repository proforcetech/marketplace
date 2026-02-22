import {
  Controller,
  Get,
  Post,
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
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingQueryDto } from './dto/rating-query.dto';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a rating (requires qualifying interaction)' })
  @ApiResponse({ status: 201, description: 'Rating submitted' })
  @ApiResponse({ status: 400, description: 'Invalid rating data' })
  @ApiResponse({ status: 403, description: 'No qualifying interaction' })
  @ApiResponse({ status: 409, description: 'Duplicate rating' })
  async createRating(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRatingDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const rating = await this.ratingsService.createRating(user.userId, dto);
    return { data: rating };
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get all ratings for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User ratings retrieved' })
  async getRatingsForUser(
    @Param('userId') userId: string,
    @Query() query: RatingQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { ratings, total } = await this.ratingsService.getRatingsForUser(
      userId,
      query,
    );
    return {
      data: ratings,
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Get('listing/:listingId')
  @Public()
  @ApiOperation({ summary: 'Get ratings for a listing' })
  @ApiParam({ name: 'listingId', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing ratings retrieved' })
  async getRatingsForListing(
    @Param('listingId') listingId: string,
    @Query() query: RatingQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { ratings, total } = await this.ratingsService.getRatingsForListing(
      listingId,
      query,
    );
    return {
      data: ratings,
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }
}

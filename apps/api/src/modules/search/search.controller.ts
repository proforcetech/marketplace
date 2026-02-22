import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard, Public } from '../../common/guards/auth.guard';
import { ThrottleGuard, ThrottleCategory } from '../../common/guards/throttle.guard';
import { SearchService } from './search.service';
import { SearchQueryDto, SuggestionsQueryDto } from './dto';

@ApiTags('Search')
@Controller('api/v1/search')
@UseGuards(AuthGuard, ThrottleGuard)
@ThrottleCategory('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search listings with geo + filters' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusMiles', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, enum: ['distance', 'newest', 'price_asc', 'price_desc', 'relevance'] })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async search(
    @Query() query: SearchQueryDto,
  ): Promise<{
    data: Record<string, unknown>[];
    promoted: Record<string, unknown>[];
    pagination: { nextCursor: string | null; hasMore: boolean; total: number };
    meta: Record<string, unknown>;
  }> {
    const result = await this.searchService.search(query);
    return {
      data: result.listings,
      promoted: result.promoted,
      pagination: result.pagination,
      meta: result.meta,
    };
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Autocomplete/typeahead suggestions' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Suggestions list' })
  async suggestions(
    @Query() query: SuggestionsQueryDto,
  ): Promise<{ data: string[] }> {
    const result = await this.searchService.suggestions(query);
    return { data: result.suggestions };
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Category tree with listing counts' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radiusMiles', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Category tree' })
  async categories(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radiusMiles') radiusMiles?: number,
  ): Promise<{ data: Record<string, unknown>[] }> {
    const result = await this.searchService.categoryTree(lat, lng, radiusMiles);
    return { data: result.categories };
  }
}

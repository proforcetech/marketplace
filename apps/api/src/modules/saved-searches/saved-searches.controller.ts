import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SavedSearchesService } from './saved-searches.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';

@ApiTags('saved-searches')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  @ApiOperation({ summary: 'Save a search query' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSavedSearchDto,
  ): Promise<Record<string, unknown>> {
    return this.savedSearchesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my saved searches' })
  async findAll(
    @CurrentUser('userId') userId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.savedSearchesService.findAllForUser(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved search' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<void> {
    return this.savedSearchesService.delete(id, userId);
  }

  @Patch(':id/notify')
  @ApiOperation({ summary: 'Toggle email notifications for a saved search' })
  async toggleNotify(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('notify') notify: boolean,
  ): Promise<Record<string, unknown>> {
    return this.savedSearchesService.toggleNotify(id, userId, notify);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { RespondOfferDto } from './dto/respond-offer.dto';

@ApiTags('Offers')
@Controller('offers')
@ApiBearerAuth()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new offer on a listing' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  @ApiResponse({ status: 400, description: 'Invalid listing or conversation' })
  @ApiResponse({ status: 404, description: 'Listing or conversation not found' })
  @ApiResponse({ status: 409, description: 'Pending offer already exists' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const offer = await this.offersService.create(user.userId, dto);
    return { data: offer };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all offers for the current user (as buyer and seller)' })
  @ApiResponse({ status: 200, description: 'User offers list' })
  async getMyOffers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown>[] }> {
    const offers = await this.offersService.getMyOffers(user.userId);
    return { data: offers };
  }

  @Get('listing/:listingId')
  @ApiOperation({ summary: 'Get all offers for a specific listing' })
  @ApiParam({ name: 'listingId', description: 'Listing ID' })
  @ApiResponse({ status: 200, description: 'Listing offers list' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async getForListing(
    @Param('listingId') listingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown>[] }> {
    const offers = await this.offersService.getForListing(listingId, user.userId);
    return { data: offers };
  }

  @Patch(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to an offer (accept, decline, or counter)' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer response processed' })
  @ApiResponse({ status: 400, description: 'Invalid action or offer expired' })
  @ApiResponse({ status: 403, description: 'Not authorized to respond' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async respond(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondOfferDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const result = await this.offersService.respond(id, user.userId, dto);
    return { data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw a pending offer (buyer only)' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 204, description: 'Offer withdrawn' })
  @ApiResponse({ status: 400, description: 'Offer cannot be withdrawn' })
  @ApiResponse({ status: 403, description: 'Not the offer creator' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.offersService.withdraw(id, user.userId);
  }
}

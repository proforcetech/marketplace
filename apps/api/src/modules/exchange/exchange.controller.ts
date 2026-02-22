import {
  Controller,
  Post,
  Param,
  Body,
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
import { ExchangeService } from './exchange.service';
import { ConfirmExchangeDto } from './dto/confirm-exchange.dto';

@ApiTags('Exchange')
@ApiBearerAuth()
@Controller()
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post('conversations/:id/exchange-qr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a QR code exchange token for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Exchange token generated' })
  @ApiResponse({ status: 403, description: 'Only the seller can generate tokens' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async generateExchangeQR(
    @Param('id') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { token: string; expiresAt: Date } }> {
    const result = await this.exchangeService.generateExchangeToken(
      conversationId,
      user.userId,
    );
    return { data: result };
  }

  @Post('exchange-tokens/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an exchange by scanning a QR token' })
  @ApiResponse({ status: 200, description: 'Exchange confirmed' })
  @ApiResponse({ status: 400, description: 'Token expired or already used' })
  @ApiResponse({ status: 403, description: 'Only the buyer can confirm' })
  @ApiResponse({ status: 404, description: 'Token not found' })
  async confirmExchange(
    @Body() dto: ConfirmExchangeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    data: { success: boolean; conversationId: string; listingId: string };
  }> {
    const result = await this.exchangeService.confirmExchange(
      dto.token,
      user.userId,
    );
    return {
      data: {
        success: true,
        conversationId: result.conversationId,
        listingId: result.listingId,
      },
    };
  }
}

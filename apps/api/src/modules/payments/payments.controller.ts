import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { PaymentsService } from './payments.service';
import { PurchasePromotionDto } from './dto/purchase-promotion.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('promotions/plans')
  @Public()
  @ApiOperation({ summary: 'Get available promotion plans with pricing' })
  @ApiResponse({ status: 200, description: 'Promotion plans list' })
  getPlans(): { data: Record<string, unknown>[] } {
    const plans = this.paymentsService.getPlans();
    return { data: plans as unknown as Record<string, unknown>[] };
  }

  @Post('promotions/purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a listing promotion' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 400, description: 'Invalid plan or listing not active' })
  @ApiResponse({ status: 403, description: 'Not the listing owner' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiResponse({ status: 409, description: 'Already has an active promotion' })
  async purchasePromotion(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchasePromotionDto,
  ): Promise<{ data: { sessionId: string; url: string } }> {
    const result = await this.paymentsService.createCheckoutSession(
      user.userId,
      dto,
    );
    return { data: result };
  }

  @Post('webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for webhook verification');
    }

    await this.paymentsService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  @Get('promotions/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's promotions" })
  @ApiResponse({ status: 200, description: 'User promotions retrieved' })
  async getMyPromotions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<{
    data: Record<string, unknown>[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const { promotions, total } = await this.paymentsService.getUserPromotions(
      user.userId,
      query,
    );
    return {
      data: promotions,
      pagination: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Get('promotions/:id/analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get promotion analytics' })
  @ApiParam({ name: 'id', description: 'Promotion purchase ID' })
  @ApiResponse({ status: 200, description: 'Promotion analytics' })
  @ApiResponse({ status: 403, description: 'Not the promotion owner' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async getPromotionAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> }> {
    const analytics = await this.paymentsService.getPromotionAnalytics(
      user.userId,
      id,
    );
    return { data: analytics };
  }
}

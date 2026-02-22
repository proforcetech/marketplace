import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/guards/auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { SubscriptionPlan } from './subscription-plans';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Get available seller subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans list' })
  getPlans(): { data: SubscriptionPlan[] } {
    const plans = this.subscriptionsService.getPlans();
    return { data: plans };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription or null' })
  async getCurrentSubscription(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> | null }> {
    const subscription = await this.subscriptionsService.getCurrentSubscription(
      user.userId,
    );
    return { data: subscription };
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a subscription' })
  @ApiResponse({ status: 201, description: 'Checkout session URL' })
  @ApiResponse({ status: 400, description: 'Invalid tier or already subscribed' })
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<{ data: { url: string } }> {
    const result = await this.subscriptionsService.createCheckoutSession(
      user.userId,
      dto.tier,
    );
    return { data: result };
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for webhook verification');
    }

    await this.subscriptionsService.handleWebhook(rawBody, signature);
    return { received: true };
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel current subscription at period end' })
  @ApiResponse({ status: 200, description: 'Subscription set to cancel at period end' })
  @ApiResponse({ status: 404, description: 'No active subscription' })
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ data: { message: string } }> {
    await this.subscriptionsService.cancelSubscription(user.userId);
    return { data: { message: 'Subscription will be cancelled at the end of the current billing period' } };
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../identity/presentation/current-user.decorator';
import { JwtAuthGuard } from '../../identity/presentation/jwt-auth.guard';
import { EntitlementService } from '../application/entitlement.service';
import { PlanService } from '../application/plan.service';
import { SubscriptionService } from '../application/subscription.service';

import { CreateCheckoutDto } from './dto/billing.dto';

import type { AuthUser } from '../../identity/presentation/authenticated-request';
import type { BillingRedirectDto, EntitlementsDto, PlanDto, SubscriptionDto, UsageDto } from '@dlv/shared-types';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly plans: PlanService,
    private readonly subscriptions: SubscriptionService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get('plans')
  listPlans(): PlanDto[] {
    return this.plans.list();
  }

  @Get('subscription')
  subscription(@CurrentUser() user: AuthUser): Promise<SubscriptionDto> {
    return this.subscriptions.get(user.userId);
  }

  @Get('entitlements')
  async entitlementsAndUsage(
    @CurrentUser() user: AuthUser,
  ): Promise<{ entitlements: EntitlementsDto; usage: UsageDto }> {
    const [entitlements, usage] = await Promise.all([
      this.entitlements.resolveDto(user.userId),
      this.subscriptions.usageSnapshot(user.userId),
    ]);
    return { entitlements, usage };
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CreateCheckoutDto): Promise<BillingRedirectDto> {
    return this.subscriptions.startCheckout(user.userId, dto);
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  portal(@CurrentUser() user: AuthUser): Promise<BillingRedirectDto> {
    return this.subscriptions.openPortal(user.userId);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthUser): Promise<SubscriptionDto> {
    return this.subscriptions.cancel(user.userId);
  }
}

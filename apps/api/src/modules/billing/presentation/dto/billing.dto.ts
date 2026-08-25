import { BillingCurrency, BillingInterval, PlanTier } from '@dlv/shared-types';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateCheckoutDto {
  @IsEnum(PlanTier) tier!: PlanTier;
  @IsOptional() @IsEnum(BillingInterval) interval?: BillingInterval;
  @IsOptional() @IsEnum(BillingCurrency) currency?: BillingCurrency;
}

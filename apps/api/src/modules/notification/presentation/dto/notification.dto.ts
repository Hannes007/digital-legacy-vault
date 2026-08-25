import { NotificationCategory } from '@dlv/shared-types';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePreferenceDto {
  @IsEnum(NotificationCategory) category!: NotificationCategory;
  @IsOptional() @IsBoolean() email?: boolean;
  @IsOptional() @IsBoolean() sms?: boolean;
  @IsOptional() @IsBoolean() whatsapp?: boolean;
  @IsOptional() @IsBoolean() push?: boolean;
}

export class CreateReminderDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) body?: string;
  @IsISO8601() dueAt!: string;
  @IsOptional() @IsInt() @Min(1) cadenceDays?: number;
}

export class PushSubscriptionDto {
  @IsString() @MinLength(1) endpoint!: string;
  @IsString() @MinLength(1) p256dh!: string;
  @IsString() @MinLength(1) auth!: string;
}

export class UnsubscribePushDto {
  @IsString() @MinLength(1) endpoint!: string;
}

import { LegalHoldScope } from '@dlv/shared-types';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PlaceLegalHoldDto {
  @IsEnum(LegalHoldScope) scopeType!: LegalHoldScope;
  @IsString() @MinLength(1) scopeId!: string;
  @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
}

import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { SharePermission } from '@dlv/shared-types';

export class CreateShareDto {
  @IsString() documentId!: string;
  @IsEmail() recipientEmail!: string;
  @IsOptional() @IsEnum(SharePermission) permission?: SharePermission;
  @IsOptional() @IsInt() @Min(1) @Max(3650) expiresInDays?: number;
}

export class CreateSecureLinkDto {
  @IsString() documentId!: string;
  @IsOptional() @IsEnum(SharePermission) permission?: SharePermission;
  @IsOptional() @IsInt() @Min(1) @Max(90) expiresInDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxViews?: number;
}

export class CreateAccessRequestDto {
  @IsString() documentId!: string;
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}

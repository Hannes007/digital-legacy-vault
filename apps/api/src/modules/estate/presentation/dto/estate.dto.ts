import { ArrayNotEmpty, IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { EmergencyScope, RelationshipRole } from '@dlv/shared-types';

export class CreateBeneficiaryDto {
  @IsString() @MaxLength(200) fullName!: string;
  @IsEmail() email!: string;
  @IsString() @MaxLength(120) relationship!: string;
  @IsOptional() @IsEnum(RelationshipRole) role?: RelationshipRole;
}

export class CreateExecutorDto {
  @IsString() @MaxLength(200) fullName!: string;
  @IsEmail() email!: string;
}

export class CreateEmergencyDto {
  @IsString() ownerId!: string;
  @IsOptional() @IsEnum(EmergencyScope) scope?: EmergencyScope;
  @IsOptional() @IsArray() @IsString({ each: true }) categoryIds?: string[];
  @IsString() @MaxLength(1000) reason!: string;
  @IsOptional() @IsBoolean() isDeathClaim?: boolean;
}

export class ApproveEmergencyDto {
  @IsOptional() @IsBoolean() medical?: boolean;
}

export class SubmitDeathVerificationDto {
  @IsString() subjectUserId!: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) evidenceDocIds!: string[];
}

export class ReviewDeathVerificationDto {
  @IsBoolean() approve!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

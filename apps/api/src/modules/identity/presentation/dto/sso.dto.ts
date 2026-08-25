import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SsoStartQueryDto {
  @IsEmail() email!: string;
}

export class SsoCallbackDto {
  @IsString() @MinLength(1) @MaxLength(4096) code!: string;
  @IsString() @MinLength(16) @MaxLength(512) state!: string;
}

export class UpsertSsoConnectionDto {
  @IsUrl({ require_tld: false }) issuerUrl!: string;
  @IsString() @MinLength(1) clientId!: string;
  @IsOptional() @IsString() @MinLength(1) clientSecret?: string;
  @IsUrl({ require_tld: false }) authorizationEndpoint!: string;
  @IsUrl({ require_tld: false }) tokenEndpoint!: string;
  @IsUrl({ require_tld: false }) userinfoEndpoint!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsString({ each: true }) emailDomains!: string[];
  @IsOptional() @IsString() defaultMemberRole?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

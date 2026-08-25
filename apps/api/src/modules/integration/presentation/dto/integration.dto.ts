import { API_KEY_SCOPES, WEBHOOK_EVENT_TYPES } from '@dlv/shared-types';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';


export class CreateApiKeyDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsIn([...API_KEY_SCOPES], { each: true })
  scopes!: Array<(typeof API_KEY_SCOPES)[number]>;
  @IsOptional() @IsUUID() organisationId?: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}

export class CreateWebhookDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }) url!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @IsIn([...WEBHOOK_EVENT_TYPES], { each: true })
  events!: Array<(typeof WEBHOOK_EVENT_TYPES)[number]>;
  @IsOptional() @IsUUID() organisationId?: string;
}

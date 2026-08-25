import { ConsentPurpose } from '@dlv/shared-types';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RecordConsentDto {
  @IsEnum(ConsentPurpose) purpose!: ConsentPurpose;
  @IsString() @MinLength(1) @MaxLength(4000) statementText!: string;
  @IsOptional() @IsString() @MaxLength(20) statementVersion?: string;
  @IsOptional() @IsString() @MaxLength(200) sourceContext?: string;
}

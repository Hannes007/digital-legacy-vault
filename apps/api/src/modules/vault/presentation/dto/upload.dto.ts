import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { DocumentType } from '@dlv/shared-types';
import { IsEnum } from 'class-validator';

export class UploadInitDto {
  @IsString() @MaxLength(500) fileName!: string;
  @IsString() @MaxLength(255) mimeType!: string;
  @IsInt() @Min(1) sizeBytes!: number;
  @IsInt() @Min(1) @Max(10_000) partCount!: number;
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsOptional() @IsString() vaultId?: string;
  @IsOptional() @IsString() categoryId?: string;
}

class UploadedPartDto {
  @IsInt() @Min(1) partNumber!: number;
  @IsString() etag!: string;
}

export class UploadCompleteDto {
  @IsString() documentId!: string;
  @IsString() uploadId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => UploadedPartDto)
  parts!: UploadedPartDto[];
}

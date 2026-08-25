import { EmergencyScope, DATA_REGIONS  } from '@dlv/shared-types';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';


export class CreateClientRelationshipDto {
  @IsEmail() clientEmail!: string;
  @IsOptional() @IsEnum(EmergencyScope) scope?: EmergencyScope;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true }) categoryIds?: string[];
}

export class RespondClientRelationshipDto {
  @IsOptional() @IsEnum(EmergencyScope) scope?: EmergencyScope;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsUUID('all', { each: true }) categoryIds?: string[];
}

export class UpdateResidencyDto {
  @IsString() @IsIn([...DATA_REGIONS]) dataRegion!: string;
}

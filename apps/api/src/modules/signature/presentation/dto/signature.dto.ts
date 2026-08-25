import { SignatureMethod } from '@dlv/shared-types';
import { IsEnum, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';


export class CreateSignatureRequestDto {
  @IsString() documentId!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(200) signerName!: string;
  @IsEmail() signerEmail!: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsOptional() @IsString() signerUserId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(90) expiresInDays?: number;
}

export class CompleteSignatureDto {
  @IsEnum(SignatureMethod) method!: SignatureMethod;
  /** Base64 image bytes (DRAW/UPLOAD) or the typed name (TYPE). */
  @IsString() @MinLength(1) @MaxLength(2_000_000) signatureImage!: string;
  @IsString() @MinLength(1) @MaxLength(2000) consentText!: string;
}

import { IsBase64, IsString, MaxLength } from 'class-validator';

export class CreateClientVaultItemDto {
  @IsString() @MaxLength(200) label!: string;
  /** AES-256-GCM ciphertext (base64), encrypted in the browser. */
  @IsString() @IsBase64() ciphertext!: string;
  @IsString() @IsBase64() iv!: string;
}

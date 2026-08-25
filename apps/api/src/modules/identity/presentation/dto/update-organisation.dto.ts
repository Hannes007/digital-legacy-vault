import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** `PATCH /api/v1/organisations/:id` body. */
export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  billingEmail?: string;
}

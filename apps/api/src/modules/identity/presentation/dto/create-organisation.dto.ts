import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

import type { OrgType } from '../../application/org-ports';

const ORG_TYPES: OrgType[] = [
  'LAW_FIRM',
  'HOSPITAL',
  'INSURER',
  'FINANCIAL_ADVISORY',
  'COMPANY',
  'FAMILY',
];

/** `POST /api/v1/organisations` body. */
export class CreateOrganisationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsIn(ORG_TYPES, { message: `must be one of: ${ORG_TYPES.join(', ')}` })
  orgType!: OrgType;

  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  billingEmail!: string;
}

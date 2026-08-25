import { describe, expect, it } from 'vitest';

import { DocumentType, Role } from './index.js';

describe('Role', () => {
  it('contains exactly the 15 canonical roles from PROJECT_MEMORY §6', () => {
    expect(Object.values(Role)).toStrictEqual([
      'GUEST',
      'REGISTERED_USER',
      'PREMIUM_USER',
      'FAMILY_ADMIN',
      'EXECUTOR',
      'BENEFICIARY',
      'LAWYER',
      'DOCTOR',
      'HOSPITAL_ADMIN',
      'FINANCIAL_ADVISER',
      'COMPANY_ADMIN',
      'SYSTEM_ADMIN',
      'SUPER_ADMIN',
      'AUDITOR',
      'SUPPORT_AGENT',
    ]);
  });

  it('uses identical keys and values (string enum, SCREAMING_SNAKE)', () => {
    for (const [key, value] of Object.entries(Role)) {
      expect(key).toBe(value);
    }
  });
});

describe('DocumentType', () => {
  it('contains exactly the 21 canonical values from PROJECT_MEMORY §5, in order', () => {
    expect(Object.values(DocumentType)).toStrictEqual([
      'LIVING_WILL',
      'LAST_WILL',
      'POWER_OF_ATTORNEY',
      'MEDICAL_DIRECTIVE',
      'INSURANCE',
      'PASSPORT',
      'IDENTITY_DOCUMENT',
      'MARRIAGE_CERTIFICATE',
      'BIRTH_CERTIFICATE',
      'TRUST',
      'PROPERTY',
      'VEHICLE_REGISTRATION',
      'BUSINESS',
      'EMPLOYMENT_CONTRACT',
      'FUNERAL_INSTRUCTIONS',
      'EMERGENCY_CONTACTS',
      'PASSWORD_REFERENCE',
      'CRYPTO_RECOVERY',
      'MEDICAL_RECORD',
      'TAX',
      'OTHER',
    ]);
  });

  it('has 21 members', () => {
    expect(Object.keys(DocumentType)).toHaveLength(21);
  });

  it('uses identical keys and values (string enum, SCREAMING_SNAKE)', () => {
    for (const [key, value] of Object.entries(DocumentType)) {
      expect(key).toBe(value);
    }
  });
});

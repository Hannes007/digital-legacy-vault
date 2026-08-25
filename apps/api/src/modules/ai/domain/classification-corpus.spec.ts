import { DocumentType } from '@dlv/shared-types';

import { classifyText } from './heuristic-classifier';

/**
 * Synthetic labelled corpus for the Phase 7 exit gate: classification
 * precision ≥ 90%. Two realistic snippets per canonical type (except OTHER,
 * which is the fallback), in the register of real SA estate documents.
 */
const CORPUS: ReadonlyArray<[DocumentType, string]> = [
  [DocumentType.LAST_WILL, 'This is the Last Will and Testament of Jane Dlamini. I hereby revoke all previous wills and codicils. I bequeath the residue of my estate to my children in equal shares. Executor of this will shall be my brother.'],
  [DocumentType.LAST_WILL, 'I, the undersigned testator, being of sound mind, declare this my last will. I bequeath my immovable property to my spouse, and direct that the residue of my estate be divided equally.'],
  [DocumentType.LIVING_WILL, 'Living will declaration: if I am ever in a persistent vegetative state with no reasonable prospect of recovery, I direct that life-sustaining treatment be withheld, including artificial life support.'],
  [DocumentType.LIVING_WILL, 'This advance directive records my end-of-life wishes. Should recovery be impossible, I refuse artificial life support and ask that comfort care only be provided.'],
  [DocumentType.POWER_OF_ATTORNEY, 'General Power of Attorney: I hereby appoint Sipho Nkosi as my agent to act on my behalf in all financial and legal matters, with full authority as my attorney-in-fact.'],
  [DocumentType.POWER_OF_ATTORNEY, 'Special power of attorney granted to my daughter to act on my behalf solely for the transfer of the property, as attorney-in-fact for the transaction.'],
  [DocumentType.MEDICAL_DIRECTIVE, 'Medical directive and healthcare proxy: my treatment preferences are recorded herein, including a do not resuscitate instruction. My proxy holds medical power to decide when I cannot.'],
  [DocumentType.MEDICAL_DIRECTIVE, 'This document records my DNR order and treatment preferences. My appointed health care proxy may consent to or refuse treatment on my behalf.'],
  [DocumentType.INSURANCE, 'Life insurance policy schedule. Policy number LP-889201. Policyholder: T. Mokoena. Sum assured: R2,500,000. Monthly premium of R850. Beneficiary nomination on file with the underwriter.'],
  [DocumentType.INSURANCE, 'Household contents insurance policy. The policyholder is covered for a cover amount of R500,000. Premium payable monthly. Policy number HH-2231.'],
  [DocumentType.PASSPORT, 'Republic of South Africa Passport. Passport number A0345678. Nationality: South African. Date of expiry: 2031-04-12. Place of issue: Pretoria. Machine readable zone below.'],
  [DocumentType.PASSPORT, 'Passport renewal copy — passport number M0022331, nationality South African, place of issue Cape Town, date of expiry 2029.'],
  [DocumentType.IDENTITY_DOCUMENT, 'Smart ID card copy. Identity number 8001015009087. RSA identity card issued by the Department of Home Affairs.'],
  [DocumentType.IDENTITY_DOCUMENT, 'Certified copy of identity document. Identity number 7505120345082. This identity card copy is certified a true copy of the original.'],
  [DocumentType.MARRIAGE_CERTIFICATE, 'Marriage certificate: the marriage between the parties was solemnised at Durban and entered in the marriage register. Antenuptial contract registered.'],
  [DocumentType.MARRIAGE_CERTIFICATE, 'Extract from the marriage register. Civil union solemnised on 14 February 2015. Spouse details recorded on the marriage certificate.'],
  [DocumentType.BIRTH_CERTIFICATE, 'Unabridged birth certificate. Registration of birth: child born on 3 March 2012, place of birth Johannesburg. Mother and father particulars recorded.'],
  [DocumentType.BIRTH_CERTIFICATE, 'Birth certificate issued by Home Affairs recording the registration of birth, place of birth Soweto, and the particulars of the mother.'],
  [DocumentType.TRUST, 'Deed of Trust for the Mokoena Family Trust, an inter vivos trust. The founder donates the initial trust property to the trustee, registered with the Master of the High Court.'],
  [DocumentType.TRUST, 'Testamentary trust provisions: the trustee shall administer the trust property for the minor beneficiaries as set out in this trust deed.'],
  [DocumentType.PROPERTY, 'Title deed T12345/2018 registered in the Deeds Office. Erf 1234 Sandton. Transfer of property from the seller, attended to by the conveyancer. Mortgage bond registered simultaneously.'],
  [DocumentType.PROPERTY, 'Sectional title unit 12, scheme SS-Villa. Title deed held at the deeds office; mortgage bond in favour of the bank; conveyancer certificate attached.'],
  [DocumentType.VEHICLE_REGISTRATION, 'Certificate of registration in respect of motor vehicle. VIN AHT123456789. Engine number 2TR-889900. Licence disc valid until November.'],
  [DocumentType.VEHICLE_REGISTRATION, 'Vehicle registration papers: chassis number ADN99887766, engine number D4D-102030, licence disc renewal receipt attached.'],
  [DocumentType.BUSINESS, 'Memorandum of Incorporation of Ubuntu Trading (Pty) Ltd, company registration 2015/123456/07, filed with CIPC. Shareholders agreement and share certificate no. 7 attached, with directors resolution.'],
  [DocumentType.BUSINESS, 'CIPC company registration documents with the shareholders agreement, share certificate for 100 ordinary shares, and a signed directors resolution.'],
  [DocumentType.EMPLOYMENT_CONTRACT, 'Contract of employment between the employer and the employee. Remuneration: R45,000 per month. Probation period of three months and a notice period of 30 days apply.'],
  [DocumentType.EMPLOYMENT_CONTRACT, 'Employment contract: the employee shall serve a probation period; remuneration reviewed annually; either party may terminate on one month notice period.'],
  [DocumentType.FUNERAL_INSTRUCTIONS, 'My funeral wishes: I would like a small memorial service, cremation rather than burial, and my ashes scattered at Hermanus. Funeral policy with AVBOB. These are my final wishes.'],
  [DocumentType.FUNERAL_INSTRUCTIONS, 'Funeral instructions — burial at the family plot, memorial service at the Methodist church; the funeral policy documents are in this vault. Final wishes recorded.'],
  [DocumentType.EMERGENCY_CONTACTS, 'Emergency contact list. In case of emergency call: spouse 082 555 1234; next of kin (brother) 083 555 9876; family GP 011 555 2222.'],
  [DocumentType.EMERGENCY_CONTACTS, 'In case of emergency: next of kin is my daughter. Emergency contact numbers and the family doctor contact list follow.'],
  [DocumentType.PASSWORD_REFERENCE, 'Password manager reference: all login credentials are stored in Bitwarden. The master password hint is with my attorney. Do not store account passwords in plain text.'],
  [DocumentType.PASSWORD_REFERENCE, 'Reference to account passwords: credentials live in the 1Password password manager; the master password is in the safe-deposit box.'],
  [DocumentType.CRYPTO_RECOVERY, 'Crypto wallet recovery: the 24-word seed phrase for the hardware wallet (Ledger) is split between two locations. Bitcoin and Ethereum accounts; private key backup instructions enclosed.'],
  [DocumentType.CRYPTO_RECOVERY, 'Recovery phrase custody note: the hardware wallet seed phrase is engraved on steel plates. Ethereum staking keys have a separate private key backup.'],
  [DocumentType.MEDICAL_RECORD, 'Medical record summary for patient J. Naidoo. Diagnosis: type 2 diabetes. Current prescription: metformin. Pathology results and treatment plan attached. Medical history reviewed.'],
  [DocumentType.MEDICAL_RECORD, 'Patient file extract — medical history, current diagnosis of hypertension, prescription renewals and the cardiology treatment plan.'],
  [DocumentType.TAX, 'SARS income tax return ITR12 for the 2025 year of assessment. Taxable income R780,000. IRP5 certificates from two employers attached. Notice of assessment enclosed.'],
  [DocumentType.TAX, 'Tax return supporting documents: IRP5, medical aid tax certificate, retirement annuity certificate. SARS assessment reflects taxable income and a refund.'],
];

describe('synthetic-corpus classification precision (Phase 7 exit ≥90%)', () => {
  it('classifies the corpus with precision >= 0.9', () => {
    let correct = 0;
    const failures: string[] = [];
    for (const [expected, text] of CORPUS) {
      const { type } = classifyText(text);
      if (type === expected) correct += 1;
      else failures.push(`expected ${expected} got ${type}`);
    }
    const precision = correct / CORPUS.length;
    expect(failures.join('; ')).toBe('');
    expect(precision).toBeGreaterThanOrEqual(0.9);
  });

  it('falls back to OTHER with low confidence on unrelated text', () => {
    const { type, confidence } = classifyText('the quick brown fox jumps over the lazy dog');
    expect(type).toBe(DocumentType.OTHER);
    expect(confidence).toBeLessThan(0.5);
  });

  it('reports higher confidence with stronger keyword evidence', () => {
    const weak = classifyText('premium');
    const strong = classifyText('Life insurance policy schedule, policy number 123, policyholder X, sum assured R1m, premium R500, underwriter Y');
    expect(strong.confidence).toBeGreaterThan(weak.confidence);
  });
});

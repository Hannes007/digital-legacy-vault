import { DocumentType, VaultKind } from '@dlv/shared-types';

import { toServerProcessable } from '../domain/server-processable';

import { AnthropicAiGateway } from './anthropic-ai.gateway';

import type { Env } from '@dlv/config';

const devEnv = {
  ANTHROPIC_API_KEY: '',
  AI_MODEL: 'claude-haiku-4-5',
  AI_MAX_OUTPUT_TOKENS: 1024,
} as Env;

const text = (s: string) => toServerProcessable({ vaultKind: VaultKind.STANDARD, text: s });

describe('AnthropicAiGateway offline dev fallback (PROJECT_MEMORY §2.8)', () => {
  const gateway = new AnthropicAiGateway(devEnv);

  it('classifies deterministically without a network call', async () => {
    const result = await gateway.classify(
      text('Life insurance policy schedule. Policy number 1. Sum assured R1m. Policyholder me. Premium R100. Underwriter Z.'),
    );
    expect(result.type).toBe(DocumentType.INSURANCE);
    expect(result.model).toBe('dev-heuristic');
    expect(result.inputTokens).toBeGreaterThan(0);
  });

  it('produces an extractive summary with token estimates', async () => {
    const result = await gateway.summarise(
      text('This policy covers the holder for R1,000,000 in the event of death. Premiums are payable monthly. The beneficiary is the surviving spouse.'),
      'Policy',
    );
    expect(result.summary.length).toBeGreaterThan(10);
    expect(result.model).toBe('dev-heuristic');
  });

  it('extracts stopword-filtered keywords from NL queries', async () => {
    const result = await gateway.extractKeywords('do I have any life insurance documents from 2024?');
    expect(result.keywords).toContain('life');
    expect(result.keywords).toContain('insurance');
    expect(result.keywords).not.toContain('do');
    expect(result.keywords).not.toContain('documents');
  });
});

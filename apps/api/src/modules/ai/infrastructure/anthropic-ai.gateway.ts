import { DocumentType } from '@dlv/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { ENV } from '../../../common/tokens';
import { estimateTokens } from '../domain/cost';
import {
  classifyText,
  extractKeywordsHeuristic,
  extractiveSummary,
} from '../domain/heuristic-classifier';

import type {
  AiGateway,
  ClassificationResult,
  KeywordResult,
  SummaryResult,
} from '../application/ports';
import type { ServerProcessableText } from '../domain/server-processable';
import type { Env } from '@dlv/config';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEV_MODEL = 'dev-heuristic';

interface MessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  model?: string;
}

/**
 * `AiGateway` over the Anthropic Claude Messages API (PROJECT_MEMORY §2.8).
 * Uses fetch — no SDK dependency — when `ANTHROPIC_API_KEY` is set; otherwise
 * a deterministic offline fallback (keyword classifier, extractive summary,
 * stopword keyword extraction) mirrors the Stripe/TSA/KMS dev-fallback
 * pattern. Model output is validated and falls back heuristically on parse
 * failure, so the pipeline degrades instead of erroring.
 *
 * Only `ServerProcessableText` reaches this class (coding-standards §10.8).
 */
@Injectable()
export class AnthropicAiGateway implements AiGateway {
  private readonly logger = new Logger(AnthropicAiGateway.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  private get live(): boolean {
    return this.env.ANTHROPIC_API_KEY.length > 0;
  }

  private async complete(system: string, user: string): Promise<{ text: string; inputTokens: number; outputTokens: number; model: string }> {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.env.AI_MODEL,
        max_tokens: this.env.AI_MAX_OUTPUT_TOKENS,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic API ${String(res.status)}`);
    }
    const body = (await res.json()) as MessagesResponse;
    const text = (body.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
    return {
      text,
      inputTokens: body.usage?.input_tokens ?? estimateTokens(system.length + user.length),
      outputTokens: body.usage?.output_tokens ?? estimateTokens(text.length),
      model: body.model ?? this.env.AI_MODEL,
    };
  }

  async classify(text: ServerProcessableText): Promise<ClassificationResult> {
    if (!this.live) {
      const result = classifyText(text);
      return {
        ...result,
        inputTokens: estimateTokens(text.length),
        outputTokens: 8,
        model: DEV_MODEL,
      };
    }
    try {
      const types = Object.values(DocumentType).join(', ');
      const completion = await this.complete(
        `You classify estate documents. Reply with ONLY a JSON object {"type": <one of: ${types}>, "confidence": <0..1>}.`,
        text,
      );
      const parsed = JSON.parse(completion.text) as { type?: string; confidence?: number };
      const known = new Set(Object.values(DocumentType) as string[]);
      const type = parsed.type !== undefined && known.has(parsed.type) ? (parsed.type as DocumentType) : DocumentType.OTHER;
      const confidence = typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.5;
      return { type, confidence, inputTokens: completion.inputTokens, outputTokens: completion.outputTokens, model: completion.model };
    } catch (error) {
      this.logger.warn(`Claude classification failed, using heuristic fallback: ${String(error)}`);
      const result = classifyText(text);
      return { ...result, inputTokens: estimateTokens(text.length), outputTokens: 8, model: DEV_MODEL };
    }
  }

  async summarise(text: ServerProcessableText, title: string): Promise<SummaryResult> {
    if (!this.live) {
      return {
        summary: extractiveSummary(text, title),
        inputTokens: estimateTokens(text.length),
        outputTokens: estimateTokens(200),
        model: DEV_MODEL,
      };
    }
    try {
      const completion = await this.complete(
        'Summarise this estate document in 2-3 plain, factual sentences for its owner. No preamble.',
        `Title: ${title}\n\n${text}`,
      );
      const summary = completion.text.trim();
      if (summary.length === 0) throw new Error('empty summary');
      return { summary, inputTokens: completion.inputTokens, outputTokens: completion.outputTokens, model: completion.model };
    } catch (error) {
      this.logger.warn(`Claude summary failed, using extractive fallback: ${String(error)}`);
      return {
        summary: extractiveSummary(text, title),
        inputTokens: estimateTokens(text.length),
        outputTokens: estimateTokens(200),
        model: DEV_MODEL,
      };
    }
  }

  async extractKeywords(query: string): Promise<KeywordResult> {
    if (!this.live) {
      return {
        keywords: extractKeywordsHeuristic(query),
        inputTokens: estimateTokens(query.length),
        outputTokens: 8,
        model: DEV_MODEL,
      };
    }
    try {
      const completion = await this.complete(
        'Extract 2-8 search keywords from this document-search query. Reply with ONLY a JSON array of lowercase strings.',
        query,
      );
      const parsed = JSON.parse(completion.text) as unknown;
      if (!Array.isArray(parsed) || parsed.some((k) => typeof k !== 'string')) throw new Error('bad keywords');
      return {
        keywords: (parsed as string[]).slice(0, 8),
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        model: completion.model,
      };
    } catch (error) {
      this.logger.warn(`Claude keyword extraction failed, using heuristic fallback: ${String(error)}`);
      return {
        keywords: extractKeywordsHeuristic(query),
        inputTokens: estimateTokens(query.length),
        outputTokens: 8,
        model: DEV_MODEL,
      };
    }
  }
}

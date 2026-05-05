import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import type { LlmGenerationOptions, LlmGenerationResult } from '@stock-tracker/shared';

import { LlmUsageLogger } from './llm-usage.logger';
import { GeminiProvider } from './providers/gemini.provider';
import { sanitizePrompt } from './sanitizer';

/**
 * 본 서비스는 Gemini 1.5 Flash 무료 티어만 사용한다 (Cloudflare/Ollama 폴백 제거).
 * Gemini 한도 초과·다운 시 ServiceUnavailableException을 던지고,
 * 호출자(ReportService 등)는 해당 작업을 status='failed'로 기록한 뒤
 * SchedulerModule이 Slack 알림을 보낸다.
 */
@Injectable()
export class LlmProviderService {
  private readonly logger = new Logger(LlmProviderService.name);

  constructor(
    private readonly gemini: GeminiProvider,
    private readonly usage: LlmUsageLogger,
  ) {}

  async generate(
    prompt: string,
    options: LlmGenerationOptions = {},
  ): Promise<LlmGenerationResult & { sanitizedPrompt: string }> {
    const sanitized = sanitizePrompt(prompt);

    try {
      const started = Date.now();
      const result = await this.gemini.generate(sanitized, options);
      result.latencyMs = Date.now() - started;

      await this.usage.record({
        provider: result.provider,
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        latencyMs: result.latencyMs,
        success: true,
      });

      return { ...result, sanitizedPrompt: sanitized };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Gemini provider failed: ${message}`);
      await this.usage.record({
        provider: this.gemini.name,
        model: this.gemini.model,
        promptTokens: null,
        completionTokens: null,
        latencyMs: 0,
        success: false,
        errorMessage: message,
      });
      throw new ServiceUnavailableException(`LLM unavailable: ${message}`);
    }
  }
}

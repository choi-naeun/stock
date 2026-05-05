import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LlmProvider } from '@stock-tracker/shared';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';

export interface UsageRecord {
  provider: LlmProvider;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class LlmUsageLogger {
  private readonly logger = new Logger(LlmUsageLogger.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async record(record: UsageRecord): Promise<void> {
    const { error } = await this.supabase.from('llm_usage_log').insert({
      provider: record.provider,
      model: record.model,
      prompt_tokens: record.promptTokens,
      completion_tokens: record.completionTokens,
      latency_ms: record.latencyMs,
      success: record.success,
      error_message: record.errorMessage ?? null,
    });

    if (error) {
      this.logger.warn(`Failed to record llm_usage_log: ${error.message}`);
    }
  }
}

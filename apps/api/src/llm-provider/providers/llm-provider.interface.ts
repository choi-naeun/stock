import type { LlmGenerationOptions, LlmGenerationResult, LlmProvider } from '@stock-tracker/shared';

export interface LlmProviderAdapter {
  readonly name: LlmProvider;
  readonly model: string;
  generate(
    sanitizedPrompt: string,
    options: LlmGenerationOptions,
  ): Promise<LlmGenerationResult>;
}

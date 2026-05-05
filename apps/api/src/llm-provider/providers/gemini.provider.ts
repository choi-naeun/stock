import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type { LlmGenerationOptions, LlmGenerationResult } from '@stock-tracker/shared';
import type { Env } from '../../config/env.schema';
import type { LlmProviderAdapter } from './llm-provider.interface';

@Injectable()
export class GeminiProvider implements LlmProviderAdapter {
  readonly name = 'gemini' as const;
  readonly model: string;
  private readonly client: GoogleGenerativeAI;

  constructor(config: ConfigService<Env, true>) {
    this.client = new GoogleGenerativeAI(config.get('GEMINI_API_KEY', { infer: true }));
    this.model = config.get('GEMINI_MODEL', { infer: true });
  }

  async generate(
    sanitizedPrompt: string,
    options: LlmGenerationOptions,
  ): Promise<LlmGenerationResult> {
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
    };
    if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
    if (options.responseSchema) generationConfig.responseSchema = options.responseSchema;

    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: options.systemPrompt,
      generationConfig: generationConfig as never,
    });

    const response = await model.generateContent(sanitizedPrompt);
    const text = response.response.text();
    const usage = response.response.usageMetadata;

    return {
      text,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: usage?.promptTokenCount ?? null,
        completionTokens: usage?.candidatesTokenCount ?? null,
      },
      latencyMs: 0,
    };
  }
}

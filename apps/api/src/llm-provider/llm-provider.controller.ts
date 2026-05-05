import { BadRequestException, Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmTestRequestSchema } from '@stock-tracker/shared';

import type { Env } from '../config/env.schema';
import { LlmProviderService } from './llm-provider.service';

@Controller('llm')
export class LlmProviderController {
  constructor(
    private readonly llm: LlmProviderService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('test')
  async test(@Body() body: unknown) {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new ForbiddenException('LLM test endpoint is disabled in production');
    }

    const parsed = LlmTestRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const result = await this.llm.generate(parsed.data.prompt, {
      systemPrompt: parsed.data.systemPrompt,
      maxTokens: parsed.data.maxTokens,
      temperature: parsed.data.temperature,
    });

    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      sanitizedPrompt: result.sanitizedPrompt,
    };
  }
}

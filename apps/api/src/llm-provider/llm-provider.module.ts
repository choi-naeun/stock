import { Module } from '@nestjs/common';

import { LlmProviderController } from './llm-provider.controller';
import { LlmProviderService } from './llm-provider.service';
import { LlmUsageLogger } from './llm-usage.logger';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  controllers: [LlmProviderController],
  providers: [LlmProviderService, GeminiProvider, LlmUsageLogger],
  exports: [LlmProviderService],
})
export class LlmProviderModule {}

import { ServiceUnavailableException } from '@nestjs/common';

import { LlmProviderService } from './llm-provider.service';
import type { LlmUsageLogger } from './llm-usage.logger';
import type { GeminiProvider } from './providers/gemini.provider';

function makeGemini(impl: (prompt: string) => Promise<string> | Promise<never>) {
  return {
    name: 'gemini' as const,
    model: 'gemini-model',
    generate: jest.fn(async (prompt: string) => ({
      text: await impl(prompt),
      provider: 'gemini' as const,
      model: 'gemini-model',
      usage: { promptTokens: 10, completionTokens: 5 },
      latencyMs: 0,
    })),
  };
}

describe('LlmProviderService', () => {
  let usage: jest.Mocked<LlmUsageLogger>;

  beforeEach(() => {
    usage = { record: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<LlmUsageLogger>;
  });

  it('returns the Gemini result on success', async () => {
    const gemini = makeGemini(async () => 'hello from gemini');
    const service = new LlmProviderService(gemini as unknown as GeminiProvider, usage);

    const result = await service.generate('프롬프트');
    expect(result.provider).toBe('gemini');
    expect(result.text).toBe('hello from gemini');
    expect(usage.record).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('throws ServiceUnavailableException when Gemini fails (no fallback)', async () => {
    const gemini = makeGemini(async () => {
      throw new Error('429 rate limit');
    });
    const service = new LlmProviderService(gemini as unknown as GeminiProvider, usage);

    await expect(service.generate('프롬프트')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(usage.record).toHaveBeenCalledTimes(1);
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errorMessage: expect.stringContaining('429') }),
    );
  });

  it('sanitizes prompt before sending to Gemini', async () => {
    const gemini = makeGemini(async () => 'ok');
    const service = new LlmProviderService(gemini as unknown as GeminiProvider, usage);

    await service.generate('평단 70,500원, 120주 보유, me@example.com');
    const sentPrompt = gemini.generate.mock.calls[0]![0];
    expect(sentPrompt).not.toContain('70,500');
    expect(sentPrompt).not.toContain('120주');
    expect(sentPrompt).not.toContain('me@example.com');
  });
});

import { z } from 'zod';

export const LlmTestRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  systemPrompt: z.string().max(2000).optional(),
  maxTokens: z.number().int().min(16).max(2048).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type LlmTestRequestDto = z.infer<typeof LlmTestRequestSchema>;

export const LlmTestResponseSchema = z.object({
  text: z.string(),
  provider: z.enum(['gemini', 'cloudflare']),
  model: z.string(),
  latencyMs: z.number(),
  sanitizedPrompt: z.string(),
});

export type LlmTestResponseDto = z.infer<typeof LlmTestResponseSchema>;

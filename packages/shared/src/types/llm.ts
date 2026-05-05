export type LlmProvider = 'gemini';

export interface LlmGenerationResult {
  text: string;
  provider: LlmProvider;
  model: string;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
  };
  latencyMs: number;
}

export interface LlmGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /** Gemini structured output. 'application/json' 시 응답이 항상 유효한 JSON으로 보장됨. */
  responseMimeType?: 'application/json' | 'text/plain';
  /**
   * Gemini structured output schema (OpenAPI subset). responseMimeType='application/json'과 함께 사용 시
   * 스키마에 맞는 JSON만 반환되도록 강제. SDK 타입은 너무 엄격해서 unknown 으로 받는다.
   */
  responseSchema?: unknown;
}

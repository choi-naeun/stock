import { z } from 'zod';

/** 빈 문자열을 undefined로 정규화. .env 파일에서 `KEY=` 형태로 비워둔 값이 옵셔널 검증을 통과하도록. */
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(10),

  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,

  DART_API_KEY: z.string().min(10),
  SEC_EDGAR_USER_AGENT: z
    .string()
    .min(5)
    .default('stock-tracker (admin@example.com)'),

  RSS_SOURCES_KR: optionalString,
  RSS_SOURCES_GLOBAL: optionalString,

  OPS_SLACK_WEBHOOK: optionalUrl,

  /** GitHub Actions 등 외부 스케줄러가 /api/cron/* 엔드포인트를 호출할 때 보내는 비밀 토큰. */
  CRON_SECRET: optionalString,

  ADMIN_EMAIL: optionalEmail,
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: Record<string, unknown> = process.env): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

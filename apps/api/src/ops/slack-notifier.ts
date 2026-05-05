import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';

/**
 * 운영 실패 알림. OPS_SLACK_WEBHOOK이 미설정이면 콘솔 로그로 대체(개발 환경 기본).
 * 알림 자체가 실패해도 호출자에게 throw하지 않는다 (알림 실패가 본 작업을 막으면 안 됨).
 */
@Injectable()
export class SlackNotifier {
  private readonly logger = new Logger(SlackNotifier.name);
  private readonly webhook: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.webhook = config.get('OPS_SLACK_WEBHOOK', { infer: true });
  }

  async notify(level: 'info' | 'warn' | 'error', text: string): Promise<void> {
    if (!this.webhook) {
      this.logger.log(`[ops-${level}] ${text}`);
      return;
    }

    const emoji = level === 'error' ? ':rotating_light:' : level === 'warn' ? ':warning:' : ':information_source:';
    try {
      const res = await fetch(this.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${emoji} *stock-tracker* ${text}` }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) {
        this.logger.warn(`Slack webhook returned ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.warn(
        `Slack notify failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

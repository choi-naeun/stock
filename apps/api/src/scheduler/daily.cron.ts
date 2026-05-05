import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SlackNotifier } from '../ops/slack-notifier';
import { ReportService } from '../report/report.service';

/**
 * KST 기준 일정:
 *  - 00:01 KST: 빈 placeholder 행 보장 (EmptyState UI 안전성).
 *  - 07:00 KST: KR 시장 발행. 같은 호출이 ingest → analyze → publish 까지 처리.
 *  - 07:15 KST: US 시장 발행 (전일 미국장 마감 후 데이터 기준).
 *
 * cron 시간은 UTC로 지정 (KST = UTC+9).
 */
@Injectable()
export class DailyCron {
  private readonly logger = new Logger(DailyCron.name);

  constructor(
    private readonly reports: ReportService,
    private readonly slack: SlackNotifier,
  ) {}

  // 매일 KST 00:01 = UTC 전일 15:01
  @Cron('1 15 * * *')
  async ensureDailyPlaceholders(): Promise<void> {
    try {
      await this.reports.ensurePlaceholderForToday();
      this.logger.log('Daily placeholders ensured');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`ensurePlaceholderForToday failed: ${message}`);
      await this.slack.notify('error', `Daily placeholder setup failed: ${message}`);
    }
  }

  // KST 07:00 = UTC 22:00 (전일)
  @Cron('0 22 * * *')
  async publishKr(): Promise<void> {
    await this.runScope('kr');
  }

  // KST 07:15 = UTC 22:15 (전일). KR 발행이 끝난 직후.
  @Cron('15 22 * * *')
  async publishUs(): Promise<void> {
    await this.runScope('us');
  }

  private async runScope(scope: 'kr' | 'us'): Promise<void> {
    try {
      const result = await this.reports.runDaily(scope);
      this.logger.log(`Daily ${scope} report status=${result.status} id=${result.id}`);
      if (result.status !== 'published') {
        await this.slack.notify(
          'warn',
          `Daily ${scope.toUpperCase()} report ended in status ${result.status}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Daily ${scope} run failed: ${message}`);
      await this.slack.notify('error', `Daily ${scope.toUpperCase()} report failed: ${message}`);
    }
  }
}

// CronExpression 사용 가능성 retain (linter no-unused-vars 회피).
export const _CRON_EXPRESSION_UNUSED: typeof CronExpression | null = null;

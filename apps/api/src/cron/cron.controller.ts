import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MarketScope } from '@stock-tracker/shared';
import { MarketScopeSchema } from '@stock-tracker/shared';

import type { Env } from '../config/env.schema';
import { ReportService } from '../report/report.service';

/**
 * 외부 스케줄러(예: GitHub Actions)가 호출하는 cron 엔드포인트.
 * Render Free 같은 슬립 환경에서 NestJS @Cron 이 못 돌 때 외부 트리거로 대체.
 * Bearer ${CRON_SECRET} 헤더를 검증한다 (Supabase 사용자 토큰과는 별개).
 */
@Controller('cron')
export class CronController {
  constructor(
    private readonly reports: ReportService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('daily')
  async runDaily(
    @Headers('authorization') authHeader: string | undefined,
    @Query('market') market: string = 'kr',
  ) {
    this.assertCronSecret(authHeader);
    const scope = this.parseScope(market);
    return this.reports.runDaily(scope);
  }

  @Post('placeholders')
  async ensurePlaceholders(@Headers('authorization') authHeader: string | undefined) {
    this.assertCronSecret(authHeader);
    await this.reports.ensurePlaceholderForToday();
    return { ok: true };
  }

  private assertCronSecret(authHeader: string | undefined): void {
    const expected = this.config.get('CRON_SECRET', { infer: true });
    if (!expected) {
      throw new ForbiddenException('CRON_SECRET is not configured');
    }
    const provided = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Invalid cron secret');
    }
  }

  private parseScope(value: string): MarketScope {
    const parsed = MarketScopeSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException('market must be "kr" or "us"');
    }
    return parsed.data;
  }
}

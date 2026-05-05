import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MarketScope } from '@stock-tracker/shared';
import { MarketScopeSchema } from '@stock-tracker/shared';

import { SupabaseAuthGuard } from '../auth/supabase.guard';
import type { Env } from '../config/env.schema';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly reports: ReportService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('today')
  async today(@Query('market') market: string = 'kr') {
    const scope = this.parseScope(market);
    const envelope = await this.reports.findPublished(scope);
    if (!envelope || envelope.status !== 'published') {
      // EmptyState용으로 200 + status 노출
      return envelope ?? { status: 'pending', marketScope: scope };
    }
    return envelope;
  }

  @UseGuards(SupabaseAuthGuard)
  @Get(':date')
  async byDate(@Query('market') market: string, @Query('date') date: string) {
    const scope = this.parseScope(market);
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const envelope = await this.reports.findPublished(scope, parsedDate);
    if (!envelope) throw new NotFoundException('Report not found');
    return envelope;
  }

  private parseScope(value: string): MarketScope {
    const parsed = MarketScopeSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException('market must be "kr" or "us"');
    }
    return parsed.data;
  }
}

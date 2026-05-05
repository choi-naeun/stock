import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MarketScope } from '@stock-tracker/shared';
import { MarketScopeSchema } from '@stock-tracker/shared';

import {
  type AuthenticatedRequest,
  SupabaseAuthGuard,
} from '../auth/supabase.guard';
import type { Env } from '../config/env.schema';
import { ReportService } from '../report/report.service';

@UseGuards(SupabaseAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly reports: ReportService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post('reports/run')
  async runReport(
    @Req() req: AuthenticatedRequest,
    @Query('market') market: string = 'kr',
  ) {
    this.assertAdmin(req);
    const scope = this.parseScope(market);
    return this.reports.runDaily(scope);
  }

  private assertAdmin(req: AuthenticatedRequest): void {
    const adminEmail = this.config.get('ADMIN_EMAIL', { infer: true });
    if (!adminEmail || req.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
      throw new ForbiddenException('Admin only');
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

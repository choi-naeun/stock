import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { loadEnv } from './config/env.schema';
import { AdminModule } from './admin/admin.module';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { CitationModule } from './citation/citation.module';
import { CronModule } from './cron/cron.module';
import { GlossaryModule } from './glossary/glossary.module';
import { HealthController } from './health/health.controller';
import { IngestionModule } from './ingestion/ingestion.module';
import { LlmProviderModule } from './llm-provider/llm-provider.module';
import { OpsModule } from './ops/ops.module';
import { ReportModule } from './report/report.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SectorTaxonomyModule } from './sector-taxonomy/sector-taxonomy.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: loadEnv,
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.token',
            '*.apiKey',
          ],
          remove: true,
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    SupabaseModule,
    OpsModule,
    AuthModule,
    LlmProviderModule,
    GlossaryModule,
    SectorTaxonomyModule,
    IngestionModule,
    CitationModule,
    AnalysisModule,
    ReportModule,
    SchedulerModule,
    AdminModule,
    CronModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

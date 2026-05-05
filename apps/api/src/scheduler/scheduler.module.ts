import { Module } from '@nestjs/common';

import { OpsModule } from '../ops/ops.module';
import { ReportModule } from '../report/report.module';
import { DailyCron } from './daily.cron';

@Module({
  imports: [ReportModule, OpsModule],
  providers: [DailyCron],
})
export class SchedulerModule {}

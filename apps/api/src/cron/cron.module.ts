import { Module } from '@nestjs/common';

import { ReportModule } from '../report/report.module';
import { CronController } from './cron.controller';

@Module({
  imports: [ReportModule],
  controllers: [CronController],
})
export class CronModule {}

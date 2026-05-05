import { Module } from '@nestjs/common';

import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [AnalysisModule, IngestionModule, AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}

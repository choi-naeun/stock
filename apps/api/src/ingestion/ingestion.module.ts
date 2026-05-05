import { Module } from '@nestjs/common';

import { IngestionService } from './ingestion.service';
import { RobotsChecker } from './robots-checker';

@Module({
  providers: [IngestionService, RobotsChecker],
  exports: [IngestionService],
})
export class IngestionModule {}

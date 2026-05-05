import { Module } from '@nestjs/common';

import { IngestionModule } from '../ingestion/ingestion.module';
import { CitationService } from './citation.service';

@Module({
  imports: [IngestionModule],
  providers: [CitationService],
  exports: [CitationService],
})
export class CitationModule {}

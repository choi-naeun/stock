import { Module } from '@nestjs/common';

import { CitationModule } from '../citation/citation.module';
import { LlmProviderModule } from '../llm-provider/llm-provider.module';
import { SectorTaxonomyModule } from '../sector-taxonomy/sector-taxonomy.module';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [LlmProviderModule, CitationModule, SectorTaxonomyModule],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}

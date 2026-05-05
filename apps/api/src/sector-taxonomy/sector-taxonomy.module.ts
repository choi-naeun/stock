import { Global, Module } from '@nestjs/common';

import { SectorTaxonomyService } from './sector-taxonomy.service';

@Global()
@Module({
  providers: [SectorTaxonomyService],
  exports: [SectorTaxonomyService],
})
export class SectorTaxonomyModule {}

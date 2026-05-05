import { Injectable, NotFoundException } from '@nestjs/common';

import type { MarketScope, SectorTaxonomy } from '@stock-tracker/shared';

import { GICS_CODES, GICS_SECTORS } from './gics.constants';
import { WICS_CODES, WICS_SECTORS } from './wics.constants';
import type { SectorEntry } from './wics.constants';

@Injectable()
export class SectorTaxonomyService {
  taxonomyForScope(scope: MarketScope): SectorTaxonomy {
    return scope === 'kr' ? 'WICS' : 'GICS';
  }

  list(taxonomy: SectorTaxonomy): SectorEntry[] {
    return taxonomy === 'WICS' ? WICS_SECTORS : GICS_SECTORS;
  }

  validCodes(taxonomy: SectorTaxonomy): string[] {
    return taxonomy === 'WICS' ? WICS_CODES : GICS_CODES;
  }

  isValidCode(taxonomy: SectorTaxonomy, code: string): boolean {
    return this.validCodes(taxonomy).includes(code);
  }

  resolveName(taxonomy: SectorTaxonomy, code: string): string {
    const entry = this.list(taxonomy).find((s) => s.code === code);
    if (!entry) throw new NotFoundException(`Unknown sector code: ${code}`);
    return entry.nameKo;
  }
}

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { GlossaryEntry } from '@stock-tracker/shared';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';

interface GlossaryRow {
  term: string;
  term_en: string | null;
  category: GlossaryEntry['category'];
  definition_advanced: string;
  definition_intermediate: string;
  definition_beginner: string;
  examples: string[];
  related_terms: string[];
}

@Injectable()
export class GlossaryService {
  private readonly logger = new Logger(GlossaryService.name);

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findByTerm(term: string): Promise<GlossaryEntry> {
    const { data, error } = await this.supabase
      .from('glossary')
      .select(
        'term, term_en, category, definition_advanced, definition_intermediate, definition_beginner, examples, related_terms',
      )
      .ilike('term', term)
      .maybeSingle<GlossaryRow>();

    if (error) {
      this.logger.error(`Supabase error fetching glossary: ${error.message}`);
      throw error;
    }
    if (!data) {
      throw new NotFoundException(`Glossary term not found: ${term}`);
    }
    return this.rowToEntry(data);
  }

  async list(): Promise<GlossaryEntry[]> {
    const { data, error } = await this.supabase
      .from('glossary')
      .select(
        'term, term_en, category, definition_advanced, definition_intermediate, definition_beginner, examples, related_terms',
      )
      .order('term', { ascending: true })
      .returns<GlossaryRow[]>();

    if (error) {
      this.logger.error(`Supabase error listing glossary: ${error.message}`);
      throw error;
    }
    return (data ?? []).map((row) => this.rowToEntry(row));
  }

  private rowToEntry(row: GlossaryRow): GlossaryEntry {
    return {
      term: row.term,
      termEn: row.term_en,
      category: row.category,
      definitions: {
        advanced: row.definition_advanced,
        intermediate: row.definition_intermediate,
        beginner: row.definition_beginner,
      },
      examples: row.examples ?? [],
      relatedTerms: row.related_terms ?? [],
    };
  }
}

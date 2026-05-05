export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface GlossaryEntry {
  term: string;
  termEn: string | null;
  category: 'indicator' | 'market' | 'macro' | 'corporate' | 'derivative';
  definitions: {
    advanced: string;
    intermediate: string;
    beginner: string;
  };
  examples: string[];
  relatedTerms: string[];
}

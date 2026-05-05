import { z } from 'zod';

export const ProficiencyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

export const GlossaryEntrySchema = z.object({
  term: z.string().min(1),
  termEn: z.string().nullable(),
  category: z.enum(['indicator', 'market', 'macro', 'corporate', 'derivative']),
  definitions: z.object({
    advanced: z.string().min(1),
    intermediate: z.string().min(1),
    beginner: z.string().min(1),
  }),
  examples: z.array(z.string()),
  relatedTerms: z.array(z.string()),
});

export type GlossaryEntryDto = z.infer<typeof GlossaryEntrySchema>;

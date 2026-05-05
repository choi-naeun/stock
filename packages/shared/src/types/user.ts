import type { ProficiencyLevel } from './glossary';

export interface UserProfile {
  userId: string;
  email: string;
  proficiency: ProficiencyLevel;
  easyModeEnabled: boolean;
  learnedTerms: string[];
  createdAt: string;
}

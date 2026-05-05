import { WICS_SECTORS } from '../sector-taxonomy/wics.constants';
import { buildAnalysisPrompt } from './prompt-builder';

describe('buildAnalysisPrompt', () => {
  it('embeds article ids as A001, A002 ...', () => {
    const { user } = buildAnalysisPrompt({
      scope: 'kr',
      date: new Date('2026-04-25T07:00:00Z'),
      taxonomy: 'WICS',
      sectors: WICS_SECTORS.slice(0, 2),
      articles: [
        {
          id: 'A001',
          url: 'https://x.com/1',
          sourceCode: 'yna',
          trustTier: 'verified',
          title: 'A 기사',
          summary: '요약',
          publishedAt: new Date(),
          language: 'ko',
          sectorTags: ['wics:2010'],
        },
      ],
    });

    expect(user).toContain('id: A001');
    expect(user).toContain('source: yna (verified)');
    expect(user).toMatch(/JSON_SCHEMA_V1/);
  });

  it('embeds sector taxonomy table as code/name pairs', () => {
    const { user } = buildAnalysisPrompt({
      scope: 'kr',
      date: new Date(),
      taxonomy: 'WICS',
      sectors: WICS_SECTORS.slice(0, 1),
      articles: [],
    });
    expect(user).toContain(`{code: "${WICS_SECTORS[0]!.code}"`);
  });

  it('system prompt mandates JSON schema and forbids advisory words', () => {
    const { system } = buildAnalysisPrompt({
      scope: 'kr',
      date: new Date(),
      taxonomy: 'WICS',
      sectors: [],
      articles: [],
    });
    expect(system).toMatch(/JSON 스키마 V1/);
    expect(system).toMatch(/매수.*매도.*손절.*익절/);
    expect(system).toMatch(/cited_ids 길이 ≥ 3/);
  });
});

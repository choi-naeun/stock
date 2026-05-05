import type { MarketScope, SectorTaxonomy } from '@stock-tracker/shared';

import type { SectorEntry } from '../sector-taxonomy/wics.constants';

export interface ArticleInput {
  id: string; // ARTICLE_ID 토큰. 'A001' 형식.
  url: string;
  sourceCode: string;
  trustTier: 'verified' | 'community' | 'unverified';
  title: string;
  summary: string;
  publishedAt: Date;
  language: 'ko' | 'en';
  sectorTags: string[];
}

export interface PromptInputs {
  scope: MarketScope;
  date: Date;
  taxonomy: SectorTaxonomy;
  sectors: SectorEntry[];
  articles: ArticleInput[];
}

export const SYSTEM_PROMPT = `당신은 한국 증시·미국 증시 섹터 분석 보조다. 다음 규칙을 어기면 응답 전체가 폐기된다.
1. 출력은 JSON 스키마 V1만. 자유 텍스트·markdown 금지.
2. 인용은 반드시 입력으로 제공된 ARTICLE_ID 토큰만 사용한다. 새 URL이나 새 id 발명은 금지.
3. 각 섹터 항목은 cited_ids 길이 ≥ 3.
4. direction_score는 -5~+5 정수. 소수점·범위 외 값 금지.
5. sector_code는 입력 SECTOR_TAXONOMY 목록 중 하나만 선택.
6. "매수","매도","손절","익절","추천 종목","비중 확대","비중 축소" 등 자문성 어휘 금지.
   대체어: "주목 섹터", "주의 섹터", "긍정적 시그널", "부정적 시그널".
7. 확정적 미래 예측(반드시/무조건/100%) 금지. "가능성", "관찰" 같은 완화 표현 사용.`;

export function buildAnalysisPrompt(inputs: PromptInputs): { system: string; user: string } {
  const dateStr = inputs.date.toISOString().slice(0, 10);
  const sectorTable = inputs.sectors
    .map((s) => `  - {code: "${s.code}", name_ko: "${s.nameKo}"}`)
    .join('\n');
  const articleBlock = inputs.articles
    .map(
      (a) =>
        `  - id: ${a.id}\n    source: ${a.sourceCode} (${a.trustTier})\n    title: ${escape(a.title)}\n    summary: ${escape(a.summary)}\n    published_at: ${a.publishedAt.toISOString()}\n    sector_keywords: [${a.sectorTags.join(', ')}]`,
    )
    .join('\n');

  const user = `DATE: ${dateStr}
SCOPE: ${inputs.scope.toUpperCase()}
TAXONOMY: ${inputs.taxonomy}
SECTOR_TAXONOMY:
${sectorTable}

ARTICLES:
${articleBlock}

TASK: 위 ${inputs.taxonomy} 섹터 각각에 대해 direction_score(-5..+5 정수), rationale(한국어 2~3문장), cited_ids(≥3, ARTICLE_ID 토큰만)를 산출하라.
근거가 부족한 섹터는 cited_ids를 비우거나 짧게 두지 말고, 해당 섹터를 응답에서 아예 제외하라(억지 인용 금지).

JSON_SCHEMA_V1:
{ "scores": [ { "sector_code": "wics:xxxx", "direction_score": 0, "rationale": "...", "cited_ids": ["A001", "A002", "A003"] } ] }

응답은 JSON만. 다른 텍스트 금지.`;

  return { system: SYSTEM_PROMPT, user };
}

function escape(s: string): string {
  return s.replace(/\n/g, ' ').slice(0, 280);
}

/**
 * WICS (FnGuide Wide Industry Classification Standard) — KRX 시장 분류.
 * 국내 리포트의 표준 섹터 단위. 정밀도 우선이라 LLM 자유 분류 대신 enum으로 강제.
 * 코드 prefix는 "wics:"로 GICS와 구분.
 */

export interface SectorEntry {
  code: string;
  nameKo: string;
  nameEn: string;
}

export const WICS_SECTORS: SectorEntry[] = [
  { code: 'wics:1010', nameKo: '에너지', nameEn: 'Energy' },
  { code: 'wics:1510', nameKo: '소재', nameEn: 'Materials' },
  { code: 'wics:2010', nameKo: '반도체', nameEn: 'Semiconductors' },
  { code: 'wics:2020', nameKo: '2차전지', nameEn: 'Secondary Battery' },
  { code: 'wics:2030', nameKo: '디스플레이', nameEn: 'Display' },
  { code: 'wics:2040', nameKo: '전기·전자', nameEn: 'Electrical Equipment' },
  { code: 'wics:2050', nameKo: '자동차·부품', nameEn: 'Automobiles & Parts' },
  { code: 'wics:2060', nameKo: '기계·장비', nameEn: 'Machinery' },
  { code: 'wics:2510', nameKo: '조선', nameEn: 'Shipbuilding' },
  { code: 'wics:2520', nameKo: '운송', nameEn: 'Transportation' },
  { code: 'wics:2530', nameKo: '건설', nameEn: 'Construction' },
  { code: 'wics:3010', nameKo: '유통·소매', nameEn: 'Retail' },
  { code: 'wics:3020', nameKo: '음식료·담배', nameEn: 'Food & Tobacco' },
  { code: 'wics:3030', nameKo: '필수소비재', nameEn: 'Consumer Staples' },
  { code: 'wics:3510', nameKo: '제약', nameEn: 'Pharmaceuticals' },
  { code: 'wics:3520', nameKo: '바이오·헬스케어', nameEn: 'Biotech & Healthcare' },
  { code: 'wics:4010', nameKo: '은행', nameEn: 'Banks' },
  { code: 'wics:4020', nameKo: '증권', nameEn: 'Securities' },
  { code: 'wics:4030', nameKo: '보험', nameEn: 'Insurance' },
  { code: 'wics:4040', nameKo: '지주사', nameEn: 'Holdings' },
  { code: 'wics:4520', nameKo: '소프트웨어·AI', nameEn: 'Software & AI' },
  { code: 'wics:4530', nameKo: '인터넷·플랫폼', nameEn: 'Internet & Platforms' },
  { code: 'wics:4540', nameKo: '게임·엔터테인먼트', nameEn: 'Games & Entertainment' },
  { code: 'wics:5010', nameKo: '통신', nameEn: 'Telecom' },
  { code: 'wics:5510', nameKo: '유틸리티', nameEn: 'Utilities' },
  { code: 'wics:6010', nameKo: 'REITs', nameEn: 'REITs' },
  { code: 'wics:7010', nameKo: '미디어·광고', nameEn: 'Media & Advertising' },
  { code: 'wics:7020', nameKo: '화장품·생활용품', nameEn: 'Cosmetics & Household' },
  { code: 'wics:7030', nameKo: '여행·레저', nameEn: 'Travel & Leisure' },
  { code: 'wics:7040', nameKo: '교육', nameEn: 'Education' },
];

export const WICS_CODES = WICS_SECTORS.map((s) => s.code);

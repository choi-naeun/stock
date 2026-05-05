/**
 * GICS (Global Industry Classification Standard) — S&P/MSCI. 해외 리포트 표준.
 * Industry Group 레벨까지 사용. 코드 prefix는 "gics:".
 */

import type { SectorEntry } from './wics.constants';

export const GICS_SECTORS: SectorEntry[] = [
  { code: 'gics:1010', nameKo: '에너지', nameEn: 'Energy' },
  { code: 'gics:1510', nameKo: '소재', nameEn: 'Materials' },
  { code: 'gics:2010', nameKo: '자본재', nameEn: 'Capital Goods' },
  { code: 'gics:2020', nameKo: '상업·전문 서비스', nameEn: 'Commercial Services' },
  { code: 'gics:2030', nameKo: '운송', nameEn: 'Transportation' },
  { code: 'gics:2510', nameKo: '자동차·부품', nameEn: 'Automobiles & Components' },
  { code: 'gics:2520', nameKo: '내구소비재·의류', nameEn: 'Consumer Durables' },
  { code: 'gics:2530', nameKo: '소비자 서비스', nameEn: 'Consumer Services' },
  { code: 'gics:2550', nameKo: '소매', nameEn: 'Retailing' },
  { code: 'gics:3010', nameKo: '식품·필수소비재', nameEn: 'Consumer Staples' },
  { code: 'gics:3510', nameKo: '헬스케어 장비·서비스', nameEn: 'Healthcare Equipment' },
  { code: 'gics:3520', nameKo: '제약·바이오', nameEn: 'Pharma & Biotech' },
  { code: 'gics:4010', nameKo: '은행', nameEn: 'Banks' },
  { code: 'gics:4020', nameKo: '금융 서비스', nameEn: 'Financial Services' },
  { code: 'gics:4030', nameKo: '보험', nameEn: 'Insurance' },
  { code: 'gics:45', nameKo: '반도체·테크 하드웨어', nameEn: 'Semiconductors & Tech HW' },
  { code: 'gics:4510', nameKo: '소프트웨어·서비스', nameEn: 'Software & Services' },
  { code: 'gics:4530', nameKo: '커뮤니케이션 서비스', nameEn: 'Communication Services' },
  { code: 'gics:5010', nameKo: '통신 서비스', nameEn: 'Telecom Services' },
  { code: 'gics:5020', nameKo: '미디어·엔터테인먼트', nameEn: 'Media & Entertainment' },
  { code: 'gics:5510', nameKo: '유틸리티', nameEn: 'Utilities' },
  { code: 'gics:6010', nameKo: '리츠 (REITs)', nameEn: 'REITs' },
  { code: 'gics:6020', nameKo: '부동산 관리·개발', nameEn: 'Real Estate' },
  { code: 'gics:7010', nameKo: '항공·방위산업', nameEn: 'Aerospace & Defense' },
  { code: 'gics:7020', nameKo: 'AI·플랫폼', nameEn: 'AI & Platforms' },
];

export const GICS_CODES = GICS_SECTORS.map((s) => s.code);

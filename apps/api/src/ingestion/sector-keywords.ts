/**
 * 1차 섹터 태깅용 키워드 사전.
 * 정밀한 분류는 AnalysisModule의 LLM이 수행하지만, 수집 단계에서 섹터 인덱스 검색을
 * 빠르게 하기 위해 해시태그 수준의 1차 매칭을 추가한다.
 *
 * sector_code 는 WICS(국내) / GICS(해외) 표준 일부 코드 사용.
 */

export interface SectorKeywordRule {
  sectorCode: string;
  patterns: RegExp[];
}

export const SECTOR_KEYWORD_RULES: SectorKeywordRule[] = [
  {
    sectorCode: 'wics:2010',
    patterns: [/반도체|메모리|HBM|D램|낸드|TSMC|파운드리/i],
  },
  {
    sectorCode: 'wics:2020',
    patterns: [/2차전지|배터리|양극재|음극재|전해질|LFP|NCM/i],
  },
  {
    sectorCode: 'wics:3520',
    patterns: [/바이오|제약|신약|임상|FDA|항암/i],
  },
  {
    sectorCode: 'wics:4520',
    patterns: [/AI|인공지능|소프트웨어|SaaS|클라우드/i],
  },
  {
    sectorCode: 'wics:2510',
    patterns: [/조선|해운|선박|컨테이너/i],
  },
  {
    sectorCode: 'wics:1510',
    patterns: [/철강|금속|화학|정유|석유/i],
  },
  {
    sectorCode: 'wics:4010',
    patterns: [/은행|증권|보험|금융|카드/i],
  },
  {
    sectorCode: 'wics:5010',
    patterns: [/통신|5G|6G|네트워크 장비/i],
  },
  {
    sectorCode: 'gics:45',
    patterns: [/Nvidia|NVDA|AMD|Intel|semiconductor/i],
  },
  {
    sectorCode: 'gics:35',
    patterns: [/Pfizer|Moderna|biotech|FDA approval|clinical trial/i],
  },
];

/**
 * 텍스트에서 매칭되는 섹터 코드들을 중복 없이 반환.
 */
export function tagSectors(text: string): string[] {
  const matches = new Set<string>();
  for (const rule of SECTOR_KEYWORD_RULES) {
    if (rule.patterns.some((re) => re.test(text))) {
      matches.add(rule.sectorCode);
    }
  }
  return Array.from(matches);
}

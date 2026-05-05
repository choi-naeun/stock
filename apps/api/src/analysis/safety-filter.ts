/**
 * F4·F7·F9 공통 가드: 투자자문 권유로 해석될 수 있는 표현을 안전 문구로 치환.
 * AnalysisModule의 LLM 응답이 직접 사용자에게 노출되기 전 반드시 통과해야 한다.
 *
 * NOTE: JavaScript의 `\b`는 한국어 문자에 대해 작동하지 않으므로 단어 경계를 위해
 * lookahead/lookbehind 또는 명시적 문자 클래스를 사용한다.
 */

interface ReplacementRule {
  pattern: RegExp;
  replacement: string;
}

// 한국어 조사·구두점·공백·문장 경계
const KO_BOUNDARY = '(?=\\s|[을를은는이가의에서로도과와다됩되었었하한된\\.,!?\\)\\]]|$)';

const RULES: ReplacementRule[] = [
  // 복합 표현 우선 (긴 패턴 먼저 매치되어야 단일 어휘 규칙이 의도치 않게 잘라먹지 않음)
  { pattern: /추천\s*종목/g, replacement: '주목 종목' },
  { pattern: /매수\s*추천/g, replacement: '긍정적 시그널 보고' },
  { pattern: /매도\s*추천/g, replacement: '부정적 시그널 보고' },
  { pattern: /비중\s*확대/g, replacement: '긍정적 흐름' },
  { pattern: /비중\s*축소/g, replacement: '부정적 흐름' },
  { pattern: /반드시\s*상승/g, replacement: '상승 가능성' },
  { pattern: /반드시\s*오를/g, replacement: '상승 가능성 있는' },
  { pattern: /반드시\s*하락/g, replacement: '하락 가능성' },
  { pattern: /반드시\s*내릴/g, replacement: '하락 가능성 있는' },
  { pattern: /반드시\s*하락할/g, replacement: '하락 가능성' },
  { pattern: /무조건\s*상승/g, replacement: '상승 가능성' },
  { pattern: /무조건\s*오를/g, replacement: '상승 가능성 있는' },
  { pattern: /무조건\s*하락/g, replacement: '하락 가능성' },
  { pattern: /무조건\s*내릴/g, replacement: '하락 가능성 있는' },
  { pattern: /100%\s*(오를|상승|이익)/g, replacement: '긍정적 시그널' },
  // 단일 어휘 (조사·문장경계 lookahead로 부분 매칭 방지)
  { pattern: new RegExp(`매수${KO_BOUNDARY}`, 'g'), replacement: '시그널 관찰' },
  { pattern: new RegExp(`매도${KO_BOUNDARY}`, 'g'), replacement: '시그널 관찰' },
  { pattern: new RegExp(`손절${KO_BOUNDARY}`, 'g'), replacement: '포지션 점검 관점' },
  { pattern: new RegExp(`익절${KO_BOUNDARY}`, 'g'), replacement: '포지션 점검 관점' },
];

const FORBIDDEN_DETECTOR = new RegExp(
  [
    '추천\\s*종목',
    '매수\\s*추천',
    '매도\\s*추천',
    '비중\\s*확대',
    '비중\\s*축소',
    '반드시\\s*(오를|상승|내릴|하락)',
    '무조건\\s*(오를|상승|내릴|하락)',
    '100%\\s*(오를|상승|이익)',
    `매수${KO_BOUNDARY}`,
    `매도${KO_BOUNDARY}`,
    `손절${KO_BOUNDARY}`,
    `익절${KO_BOUNDARY}`,
  ].join('|'),
);

export function applySafetyFilter(text: string): string {
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

/**
 * 단위 테스트·CI 검증용. 필터 적용 후에도 금칙 표현이 남아 있으면 true 반환.
 */
export function containsForbidden(text: string): boolean {
  return FORBIDDEN_DETECTOR.test(text);
}

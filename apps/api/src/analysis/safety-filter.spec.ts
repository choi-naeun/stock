import { applySafetyFilter, containsForbidden } from './safety-filter';

describe('safety filter', () => {
  it('replaces 매수 추천 with 긍정적 시그널 보고', () => {
    const out = applySafetyFilter('이 종목은 매수 추천됩니다.');
    expect(out).not.toContain('매수 추천');
    expect(out).toContain('긍정적 시그널 보고');
  });

  it('replaces 손절/익절 with 포지션 점검 관점', () => {
    expect(applySafetyFilter('손절을 고려하세요')).toContain('포지션 점검 관점');
    expect(applySafetyFilter('익절 타이밍입니다')).toContain('포지션 점검 관점');
  });

  it('replaces 비중 확대/축소', () => {
    expect(applySafetyFilter('비중 확대 권장')).toContain('긍정적 흐름');
    expect(applySafetyFilter('비중 축소 검토')).toContain('부정적 흐름');
  });

  it('softens 반드시 오를/내릴', () => {
    expect(applySafetyFilter('반드시 오를 종목')).toContain('상승 가능성');
    expect(applySafetyFilter('반드시 하락할 것')).toContain('하락 가능성');
  });

  it('detects forbidden words via containsForbidden', () => {
    expect(containsForbidden('매수 추천을 한다')).toBe(true);
    expect(containsForbidden('주목 섹터로 분류된다')).toBe(false);
  });

  it('post-filter output passes containsForbidden = false', () => {
    const tricky = '이 종목 무조건 오를 것이고 매도 추천한다 손절 익절 모두 가능';
    const cleaned = applySafetyFilter(tricky);
    expect(containsForbidden(cleaned)).toBe(false);
  });
});

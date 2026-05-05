import { tagSectors } from './sector-keywords';

describe('tagSectors', () => {
  it('tags semiconductor news with WICS 2010', () => {
    expect(tagSectors('삼성전자 HBM3E 양산 본격화')).toContain('wics:2010');
  });

  it('tags battery news with WICS 2020', () => {
    expect(tagSectors('LG에너지솔루션 LFP 양극재 투자 확대')).toContain('wics:2020');
  });

  it('tags US Nvidia news with GICS 45', () => {
    expect(tagSectors('Nvidia announces new chip')).toContain('gics:45');
  });

  it('returns empty array when no keywords match', () => {
    expect(tagSectors('오늘 날씨가 좋습니다')).toEqual([]);
  });

  it('returns unique tags when multiple patterns hit same sector', () => {
    const tags = tagSectors('반도체 HBM 메모리 D램 강세');
    expect(tags.filter((t) => t === 'wics:2010').length).toBe(1);
  });
});

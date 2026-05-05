import { sanitizePrompt } from './sanitizer';

describe('sanitizePrompt', () => {
  it('masks KRW monetary values', () => {
    const result = sanitizePrompt('삼성전자 평단 70,500원, 매입금액 8,460,000원');
    expect(result).not.toContain('70,500');
    expect(result).not.toContain('8,460,000');
    expect(result).toContain('[MASKED_AMOUNT]');
  });

  it('masks share quantity', () => {
    const result = sanitizePrompt('삼성전자 120주 보유');
    expect(result).not.toContain('120주');
    expect(result).toContain('[MASKED_QTY]');
  });

  it('masks email addresses', () => {
    const result = sanitizePrompt('send to hw.telos2@gmail.com please');
    expect(result).not.toContain('hw.telos2@gmail.com');
    expect(result).toContain('[MASKED_EMAIL]');
  });

  it('masks USD amounts', () => {
    const result = sanitizePrompt('bought 50 shares at $142.50');
    expect(result).not.toContain('$142.50');
    expect(result).toContain('[MASKED_AMOUNT]');
  });

  it('preserves ticker and company name', () => {
    const result = sanitizePrompt('삼성전자(005930) 분석');
    expect(result).toContain('삼성전자');
    expect(result).toContain('005930');
  });

  it('handles multiple sensitive values in one prompt', () => {
    const input =
      '내 포트폴리오: 삼성전자(005930) 120주 평단 70,500원, AAPL 50 shares at $180.00, 연락처 me@example.com';
    const result = sanitizePrompt(input);
    expect(result).not.toContain('120주');
    expect(result).not.toContain('70,500');
    expect(result).not.toContain('$180.00');
    expect(result).not.toContain('me@example.com');
    expect(result).toContain('삼성전자');
    expect(result).toContain('AAPL');
  });

  it('supports custom tokens', () => {
    const result = sanitizePrompt('평단 70,500원', { amountToken: '<$>' });
    expect(result).toContain('<$>');
  });
});

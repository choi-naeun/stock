import { hashUrl, normalizeUrl } from './url-hash';

describe('hashUrl', () => {
  it('produces deterministic SHA-256 hex', () => {
    const a = hashUrl('https://example.com/article');
    const b = hashUrl('https://example.com/article');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs for different URLs', () => {
    expect(hashUrl('https://a.com')).not.toBe(hashUrl('https://b.com'));
  });
});

describe('normalizeUrl', () => {
  it('strips utm_ and tracking params', () => {
    expect(normalizeUrl('https://example.com/x?utm_source=ig&id=42&fbclid=abc')).toBe(
      'https://example.com/x?id=42',
    );
  });

  it('lowercases host', () => {
    expect(normalizeUrl('https://Example.COM/Path')).toBe('https://example.com/Path');
  });

  it('removes hash fragments', () => {
    expect(normalizeUrl('https://x.com/a#section')).toBe('https://x.com/a');
  });

  it('removes trailing slash except root', () => {
    expect(normalizeUrl('https://x.com/a/')).toBe('https://x.com/a');
    expect(normalizeUrl('https://x.com/')).toBe('https://x.com/');
  });

  it('returns input for invalid URL', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

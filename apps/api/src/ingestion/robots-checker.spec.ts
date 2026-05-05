import { RobotsChecker } from './robots-checker';

describe('RobotsChecker.isDisallowed (private behavior via isAllowed integration)', () => {
  let checker: RobotsChecker;
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    checker = new RobotsChecker();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fetchMock.mockReset();
  });

  it('allows when robots.txt has no Disallow: /', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => 'User-agent: *\nDisallow: /private/\nAllow: /',
    });
    expect(await checker.isAllowed('https://example.com/feed')).toBe(true);
  });

  it('blocks when User-agent: * has Disallow: /', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => 'User-agent: *\nDisallow: /',
    });
    expect(await checker.isAllowed('https://blocked.example.com/feed')).toBe(false);
  });

  it('treats 404 robots.txt as allowed', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' });
    expect(await checker.isAllowed('https://no-robots.example.com/feed')).toBe(true);
  });

  it('caches result by host', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => 'User-agent: *\nAllow: /',
    });
    await checker.isAllowed('https://cached.example.com/a');
    await checker.isAllowed('https://cached.example.com/b');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns true for invalid URL host (fail-open at parse, but our impl returns false on bad URL)', async () => {
    expect(await checker.isAllowed('not-a-url')).toBe(false);
  });
});

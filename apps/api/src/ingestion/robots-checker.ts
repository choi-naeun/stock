import { Injectable, Logger } from '@nestjs/common';

/**
 * 단순 in-memory robots.txt 캐시. 매체별로 1회 fetch 후 24h 동안 결과 재사용.
 * RSS·공식 API만 사용하므로 거의 항상 통과하지만, PRD에서 robots.txt 준수를 명시했기에
 * 시스템 레벨 안전장치로 둔다.
 */
@Injectable()
export class RobotsChecker {
  private readonly logger = new Logger(RobotsChecker.name);
  private readonly cache = new Map<string, { allowed: boolean; checkedAt: number }>();
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  async isAllowed(url: string, userAgent = 'stock-tracker'): Promise<boolean> {
    const host = safeHost(url);
    if (!host) return false;

    const hit = this.cache.get(host);
    if (hit && Date.now() - hit.checkedAt < this.ttlMs) {
      return hit.allowed;
    }

    const allowed = await this.fetchRobots(host, userAgent);
    this.cache.set(host, { allowed, checkedAt: Date.now() });
    return allowed;
  }

  private async fetchRobots(host: string, userAgent: string): Promise<boolean> {
    try {
      const res = await fetch(`https://${host}/robots.txt`, {
        signal: AbortSignal.timeout(5_000),
        headers: { 'User-Agent': userAgent },
      });
      if (!res.ok) return true; // 404·5xx → 명시적 금지 없음
      const body = await res.text();
      return !this.isDisallowed(body, userAgent);
    } catch (err) {
      this.logger.warn(
        `robots.txt fetch failed for ${host}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return true; // network 실패 시 차단하지 않음 (RSS 본 fetch에서 실패 처리)
    }
  }

  private isDisallowed(body: string, userAgent: string): boolean {
    // 매우 단순 파서: User-agent: * 또는 매칭 UA 의 Disallow: /  만 검사.
    // PRD 범위(공식 RSS)에서 충분.
    const lines = body.split('\n').map((l) => l.trim());
    let inMatchingGroup = false;
    for (const line of lines) {
      if (line.startsWith('#') || line === '') continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).toLowerCase();
      const value = line.slice(colonIdx + 1).trim();
      if (key === 'user-agent') {
        inMatchingGroup = value === '*' || value.toLowerCase() === userAgent.toLowerCase();
      } else if (inMatchingGroup && key === 'disallow' && value === '/') {
        return true;
      }
    }
    return false;
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

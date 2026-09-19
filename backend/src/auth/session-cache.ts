/**
 * In-Memory L1 Session Cache for High-Throughput Auth Lookups
 *
 * Prevents repeating expensive PostgreSQL queries (SELECT session, SELECT users)
 * on every single incoming HTTP request.
 *
 * TTL: 60 seconds (safe balance between performance and session revocation latency)
 */

interface CachedSession {
  session: any;
  expiresAt: number;
}

const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const sessionCache = new Map<string, CachedSession>();
const MAX_CACHE_SIZE = 10000;

function cleanupStaleSessions() {
  const now = Date.now();
  for (const [key, entry] of sessionCache.entries()) {
    if (entry.expiresAt <= now) {
      sessionCache.delete(key);
    }
  }
}

export function getCachedSession(cacheKey: string): any | null {
  if (!cacheKey) return null;
  const cached = sessionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session;
  }
  return null;
}

export function setCachedSession(cacheKey: string, session: any): void {
  if (!cacheKey || !session) return;
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    cleanupStaleSessions();
  }
  sessionCache.set(cacheKey, {
    session,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

export function invalidateCachedSession(cacheKey: string): void {
  if (cacheKey) {
    sessionCache.delete(cacheKey);
  }
}

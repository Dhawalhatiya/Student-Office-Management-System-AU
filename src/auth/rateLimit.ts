export const MAX_FAILED_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const STORAGE_KEY = 'avu_soms_rate_limit_v1';
const memoryBuckets: Record<string, number[]> = {};

function readStore(): Record<string, number[]> {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as Record<string, number[]>;
      }
    }
  } catch {
    // Non-browser or storage unavailable
  }
  return memoryBuckets;
}

function writeStore(buckets: Record<string, number[]>): void {
  Object.assign(memoryBuckets, buckets);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buckets));
    }
  } catch {
    // Non-browser or storage unavailable
  }
}

export function getRateLimitStatus(
  emailNormalized: string,
  nowMs: number = Date.now()
): { limited: boolean; minutesRemaining: number; recentAttempts: number[] } {
  const store = readStore();
  const existing = store[emailNormalized] ?? [];
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const recent = existing.filter((ts) => ts > cutoff);

  if (recent.length >= MAX_FAILED_ATTEMPTS) {
    const oldestRelevant = recent[recent.length - MAX_FAILED_ATTEMPTS];
    const msLeft = Math.max(60_000, oldestRelevant + RATE_LIMIT_WINDOW_MS - nowMs);
    const minutesRemaining = Math.max(1, Math.ceil(msLeft / 60_000));
    return { limited: true, minutesRemaining, recentAttempts: recent };
  }

  return { limited: false, minutesRemaining: 0, recentAttempts: recent };
}

export function recordFailedAttempt(
  emailNormalized: string,
  nowMs: number = Date.now()
): void {
  const store = readStore();
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const recent = (store[emailNormalized] ?? []).filter((ts) => ts > cutoff);
  recent.push(nowMs);
  store[emailNormalized] = recent;
  writeStore(store);
}

export function clearFailedAttempts(emailNormalized: string): void {
  const store = readStore();
  if (store[emailNormalized]) {
    delete store[emailNormalized];
    delete memoryBuckets[emailNormalized];
    writeStore(store);
  }
}

export function resetRateLimitsForTests(): void {
  for (const key of Object.keys(memoryBuckets)) {
    delete memoryBuckets[key];
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

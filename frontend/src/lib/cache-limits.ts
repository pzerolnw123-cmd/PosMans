export function pruneExpiredEntries<T extends { expiresAt: number }>(cache: Map<string, T>, now = Date.now()) {
  for (const [cacheKey, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(cacheKey);
    }
  }
}

export function enforceMaxEntries<T>(cache: Map<string, T>, maxEntries: number) {
  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    cache.delete(oldestKey);
  }
}

export function sumByteLengths<T>(entries: Iterable<T>, getByteLength: (entry: T) => number) {
  let total = 0;
  for (const entry of entries) {
    total += getByteLength(entry);
  }
  return total;
}

/**
 * Utilitários para memoização e otimização de performance
 */

/**
 * Simples memoização para valores computados caros
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
): T {
  const cache = new Map<string, ReturnType<T>>();
  const defaultKeyGenerator = (...args: Parameters<T>) => JSON.stringify(args);
  const getKey = keyGenerator || defaultKeyGenerator;

  return ((...args: Parameters<T>) => {
    const key = getKey(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limitar tamanho do cache para não causar memory leak
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
}

/**
 * Debounce para funções que chamam muitas vezes
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 300,
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    lastArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        fn(...lastArgs);
      }
      timeoutId = null;
    }, delayMs);
  }) as T;
}

/**
 * Throttle para funções que precisam de limite de frequência
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number = 300,
): T {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCallTime >= intervalMs) {
      fn(...args);
      lastCallTime = now;

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const delay = intervalMs - (now - lastCallTime);
      timeoutId = setTimeout(() => {
        fn(...args);
        lastCallTime = Date.now();
        timeoutId = null;
      }, delay);
    }
  }) as T;
}

/**
 * Deduplica chamadas simultâneas à mesma função
 */
export function deduplicateAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
): T {
  const pendingCalls = new Map<string, Promise<any>>();
  const keyGenerator = (...args: Parameters<T>) => JSON.stringify(args);

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    if (pendingCalls.has(key)) {
      return pendingCalls.get(key)!;
    }

    const promise = fn(...args);
    pendingCalls.set(key, promise);

    try {
      return await promise;
    } finally {
      pendingCalls.delete(key);
    }
  }) as T;
}

/**
 * Batch múltiplas chamadas em uma única chamada
 */
export function batch<T, R>(
  fn: (items: T[]) => Promise<R[]>,
  batchSize: number = 50,
) {
  let queue: T[] = [];
  let timeoutId: NodeJS.Timeout | null = null;
  const pendingPromises: Map<T, Promise<R>> = new Map();

  const flush = async () => {
    if (queue.length === 0) return;

    const batch = queue.splice(0, batchSize);
    const results = await fn(batch);

    batch.forEach((item, index) => {
      const promise = Promise.resolve(results[index]);
      const resolver = pendingPromises.get(item);
      if (resolver) {
        // Já promisificado, adicionar resultado
      }
    });
  };

  return async (item: T): Promise<R> => {
    queue.push(item);

    const promise = new Promise<R>((resolve) => {
      pendingPromises.set(item, promise as any);
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (queue.length >= batchSize) {
      await flush();
    } else {
      timeoutId = setTimeout(flush, 100);
    }

    return promise;
  };
}

/**
 * Cache com TTL (time-to-live)
 */
export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }> = new Map();

  constructor(private defaultTTLMs: number = 60000) {}

  get(key: K): V | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTLMs);
    this.cache.set(key, { value, expiresAt });
  }

  has(key: K): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

import { useRef } from "react";

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Hook para retry automático com exponential backoff
 * Útil para operações que podem falhar temporariamente (rede instável)
 */
export function useRetry(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number) => void,
  ): Promise<T> {
    let lastError: unknown;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Se foi última tentativa ou erro não é retentável, lançar
        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        // Aguardar antes de retry
        await sleep(delay);
        onRetry?.(attempt, delay);

        // Aumentar delay para próxima tentativa (exponential backoff)
        delay = Math.min(delay * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return { execute, cancel };
}

/**
 * Determina se um erro é retentável
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Erros de rede
    if (error.message.includes("fetch") || error.message.includes("Network")) {
      return true;
    }

    // Timeouts
    if (error.message.includes("timeout")) {
      return true;
    }
  }

  // Se for response, checar status HTTP
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") {
      // Retry em 5xx e 429 (rate limit)
      // Não retry em 4xx (client error)
      return status >= 500 || status === 429;
    }
  }

  return false;
}

/**
 * Utility para aguardar um tempo
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

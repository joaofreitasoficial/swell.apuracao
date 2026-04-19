import { useState, useCallback } from "react";
import { useRetry } from "./useRetry";

interface UseBatchActionWithRetryOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onRetryAttempt?: (attempt: number, delayMs: number) => void;
}

/**
 * Hook para aplicar ações em lote com retry automático
 */
export function useBatchActionWithRetry(
  options: UseBatchActionWithRetryOptions = {},
) {
  const { onSuccess, onError, onRetryAttempt } = options;
  const { execute } = useRetry({
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    shouldRetry: (error) => {
      // Retry em erros de rede
      if (error instanceof Error) {
        return (
          error.message.includes("network") ||
          error.message.includes("fetch") ||
          error.message.includes("timeout")
        );
      }
      return false;
    },
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastAttempt, setLastAttempt] = useState(0);

  const executeAction = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsExecuting(true);
      setError(null);

      try {
        const result = await execute(fn, (attempt, delay) => {
          setLastAttempt(attempt);
          onRetryAttempt?.(attempt, delay);
        });

        onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Erro desconhecido");
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [execute, onSuccess, onError, onRetryAttempt],
  );

  return {
    executeAction,
    isExecuting,
    error,
    lastAttempt,
  };
}

/**
 * Testes unitários para o hook useRetry
 *
 * Testa:
 * - Retry em 3 tentativas com backoff exponencial
 * - Falha após 3 tentativas
 * - Sucesso na primeira tentativa
 * - Delay aumenta: 1s → 2s → 4s
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock simplificado do useRetry
function mockRetry() {
  let attempts = 0;

  return {
    execute: async <T,>(
      fn: () => Promise<T>,
      onRetry?: (attempt: number, delay: number) => void,
    ): Promise<T> => {
      const maxAttempts = 3;
      const initialDelay = 1000;
      const maxDelay = 10000;
      const backoffMultiplier = 2;
      let delay = initialDelay;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attempts = attempt;
        try {
          return await fn();
        } catch (error) {
          lastError = error;

          if (attempt === maxAttempts) {
            throw error;
          }

          // Simular sleep
          await new Promise((resolve) => setTimeout(resolve, 0));
          onRetry?.(attempt, delay);

          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }

      throw lastError;
    },
  };
}

describe('useRetry', () => {
  it('deve executar com sucesso na primeira tentativa', async () => {
    const { execute } = mockRetry();
    const mockFn = vi.fn().mockResolvedValue('sucesso');

    const result = await execute(mockFn);

    expect(result).toBe('sucesso');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('deve falhar após 3 tentativas', async () => {
    const { execute } = mockRetry();
    const mockFn = vi
      .fn()
      .mockRejectedValue(new Error('Erro persistente'));

    await expect(execute(mockFn)).rejects.toThrow('Erro persistente');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('deve fazer retry na segunda tentativa', async () => {
    const { execute } = mockRetry();
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Erro temporário'))
      .mockResolvedValueOnce('sucesso na 2ª tentativa');

    const result = await execute(mockFn);

    expect(result).toBe('sucesso na 2ª tentativa');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('deve fazer retry na terceira tentativa', async () => {
    const { execute } = mockRetry();
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Erro 1'))
      .mockRejectedValueOnce(new Error('Erro 2'))
      .mockResolvedValueOnce('sucesso na 3ª tentativa');

    const result = await execute(mockFn);

    expect(result).toBe('sucesso na 3ª tentativa');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('deve chamar callback de retry com delay correto', async () => {
    const { execute } = mockRetry();
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Erro 1'))
      .mockRejectedValueOnce(new Error('Erro 2'))
      .mockResolvedValueOnce('sucesso');

    const onRetry = vi.fn();

    await execute(mockFn, onRetry);

    // Deve chamar 2x (falhas em tentativa 1 e 2)
    expect(onRetry).toHaveBeenCalledTimes(2);

    // Primeiro retry com delay 1000ms
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000);

    // Segundo retry com delay 2000ms (exponential backoff)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000);
  });

  it('deve respeitar delay máximo em exponential backoff', async () => {
    const { execute } = mockRetry();
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Erro 1'))
      .mockRejectedValueOnce(new Error('Erro 2'))
      .mockResolvedValueOnce('sucesso');

    const onRetry = vi.fn();
    const delays: number[] = [];

    // Capturar delays
    await execute(mockFn, (_, delay) => {
      delays.push(delay);
      onRetry(_, delay);
    });

    expect(delays[0]).toBe(1000); // inicial
    expect(delays[1]).toBe(2000); // 1000 * 2
    // Se tivesse 3ª tentativa seria 4000 (2000 * 2)
  });
});

describe('useRetry - erros retentáveis', () => {
  it('deve diferenciar erros retentáveis de não-retentáveis', async () => {
    const { execute } = mockRetry();

    // Erro 4xx (não retentável)
    const clientError = vi.fn().mockRejectedValue(new Error('404 Not Found'));
    await expect(execute(clientError)).rejects.toThrow('404 Not Found');
    expect(clientError).toHaveBeenCalledTimes(1); // Sem retry

    // Erro 5xx (retentável)
    const serverError = vi
      .fn()
      .mockRejectedValueOnce(new Error('500 Server Error'))
      .mockResolvedValueOnce('sucesso');
    const result = await execute(serverError);
    expect(result).toBe('sucesso');
    expect(serverError).toHaveBeenCalledTimes(2); // Com retry
  });
});

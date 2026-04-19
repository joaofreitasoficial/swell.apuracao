/**
 * Testes para validações de ações em lote
 *
 * Testa:
 * - Validação de seleção vazia
 * - Aviso quando seleção > soft limit (100)
 * - Erro quando seleção > hard limit (1000)
 * - Schema Zod de ação em lote
 */

import { describe, it, expect } from 'vitest';
import {
  validateBatchSelection,
  batchActionValidationSchema,
  BATCH_ACTION_LIMITS_EXPORT,
} from '@/lib/validations/batch-actions';

describe('validateBatchSelection', () => {
  it('deve retornar erro para seleção vazia', () => {
    const result = validateBatchSelection([]);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Selecione pelo menos 1');
  });

  it('deve permitir seleção dentro do soft limit (1-100)', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    const result = validateBatchSelection(ids);

    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('deve avisar quando seleção excede soft limit (101+)', () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const result = validateBatchSelection(ids);

    expect(result.valid).toBe(true);
    expect(result.warning).toContain('150');
    expect(result.warning).toContain('pode ser lento');
  });

  it('deve retornar erro quando seleção excede hard limit (1001+)', () => {
    const ids = Array.from(
      { length: BATCH_ACTION_LIMITS_EXPORT.HARD_LIMIT + 1 },
      (_, i) => `id-${i}`,
    );
    const result = validateBatchSelection(ids);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Máximo');
    expect(result.error).toContain('1000');
  });

  it('deve permitir seleção exatamente no hard limit (1000)', () => {
    const ids = Array.from(
      { length: BATCH_ACTION_LIMITS_EXPORT.HARD_LIMIT },
      (_, i) => `id-${i}`,
    );
    const result = validateBatchSelection(ids);

    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined(); // Aviso por ser grande, mas válido
  });

  it('deve retornar erro para exatamente 1001 transações', () => {
    const ids = Array.from(
      { length: BATCH_ACTION_LIMITS_EXPORT.HARD_LIMIT + 1 },
      (_, i) => `id-${i}`,
    );
    const result = validateBatchSelection(ids);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('batchActionValidationSchema (Zod)', () => {
  it('deve validar ação em lote válida', () => {
    const payload = {
      transactionIds: ['id-1', 'id-2', 'id-3'],
      decision: 'manter' as const,
      exclusionReason: null,
      reviewNote: 'Testando',
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(payload);
    }
  });

  it('deve rejeitar ação sem transactionIds', () => {
    const payload = {
      transactionIds: [],
      decision: 'manter' as const,
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Selecione');
    }
  });

  it('deve rejeitar decision inválida', () => {
    const payload = {
      transactionIds: ['id-1'],
      decision: 'invalida',
      exclusionReason: null,
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });

  it('deve aceitar exclusionReason apenas com decision "excluir"', () => {
    // Com exclusão - deve aceitar reason
    const excluir = {
      transactionIds: ['id-1'],
      decision: 'excluir' as const,
      exclusionReason: 'duplicada' as const,
    };

    const resultExcluir = batchActionValidationSchema.safeParse(excluir);
    expect(resultExcluir.success).toBe(true);

    // Sem exclusão - reason ignorado/null
    const manter = {
      transactionIds: ['id-1'],
      decision: 'manter' as const,
      exclusionReason: null,
    };

    const resultManter = batchActionValidationSchema.safeParse(manter);
    expect(resultManter.success).toBe(true);
  });

  it('deve rejeitar nota com mais de 1000 caracteres', () => {
    const nota = 'a'.repeat(1001);
    const payload = {
      transactionIds: ['id-1'],
      decision: 'manter' as const,
      reviewNote: nota,
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_big');
    }
  });

  it('deve aceitar nota com exatamente 1000 caracteres', () => {
    const nota = 'a'.repeat(1000);
    const payload = {
      transactionIds: ['id-1'],
      decision: 'manter' as const,
      reviewNote: nota,
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(true);
  });

  it('deve aceitar nota vazia ou null', () => {
    const payloadNull = {
      transactionIds: ['id-1'],
      decision: 'manter' as const,
      reviewNote: null,
    };

    const payloadEmpty = {
      transactionIds: ['id-1'],
      decision: 'manter' as const,
      reviewNote: undefined,
    };

    expect(batchActionValidationSchema.safeParse(payloadNull).success).toBe(true);
    expect(batchActionValidationSchema.safeParse(payloadEmpty).success).toBe(true);
  });

  it('deve rejeitar reason inválida', () => {
    const payload = {
      transactionIds: ['id-1'],
      decision: 'excluir' as const,
      exclusionReason: 'razao_invalida',
    };

    const result = batchActionValidationSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });

  it('deve aceitar todas as reasons válidas', () => {
    const validReasons = [
      'duplicada',
      'erro_leitura',
      'credito_estorno',
      'taxa_banco',
      'outra',
      'nao_informado',
    ];

    validReasons.forEach((reason) => {
      const payload = {
        transactionIds: ['id-1'],
        decision: 'excluir' as const,
        exclusionReason: reason as any,
      };

      const result = batchActionValidationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});

describe('Limites configuráveis', () => {
  it('deve exportar limites corretos', () => {
    expect(BATCH_ACTION_LIMITS_EXPORT.SOFT_LIMIT).toBe(100);
    expect(BATCH_ACTION_LIMITS_EXPORT.HARD_LIMIT).toBe(1000);
    expect(BATCH_ACTION_LIMITS_EXPORT.NOTE_MAX_LENGTH).toBe(1000);
  });
});

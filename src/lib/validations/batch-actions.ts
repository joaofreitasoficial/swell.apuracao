import { z } from "zod";

/**
 * Validações para ações em lote
 */

const BATCH_ACTION_LIMITS = {
  // Limite recomendado de seleção simultânea
  SOFT_LIMIT: 100,
  // Limite máximo antes de erro
  HARD_LIMIT: 1000,
  // Limite de caracteres para observação
  NOTE_MAX_LENGTH: 1000,
};

export function validateBatchSelection(
  transactionIds: string[],
): { valid: boolean; warning?: string; error?: string } {
  if (transactionIds.length === 0) {
    return { valid: false, error: "Selecione pelo menos 1 transação." };
  }

  if (transactionIds.length > BATCH_ACTION_LIMITS.HARD_LIMIT) {
    return {
      valid: false,
      error: `Máximo ${BATCH_ACTION_LIMITS.HARD_LIMIT} transações por ação.`,
    };
  }

  if (transactionIds.length > BATCH_ACTION_LIMITS.SOFT_LIMIT) {
    return {
      valid: true,
      warning: `Você selecionou ${transactionIds.length} transações. Isso pode ser lento. Considere fazer em lotes menores.`,
    };
  }

  return { valid: true };
}

export const batchActionValidationSchema = z.object({
  transactionIds: z
    .array(z.string().uuid())
    .min(1, "Selecione pelo menos 1 transação")
    .max(
      BATCH_ACTION_LIMITS.HARD_LIMIT,
      `Máximo ${BATCH_ACTION_LIMITS.HARD_LIMIT} transações`,
    ),
  decision: z.enum(["manter", "excluir", "pendente"]),
  exclusionReason: z
    .enum([
      "duplicada",
      "erro_leitura",
      "credito_estorno",
      "taxa_banco",
      "outra",
      "nao_informado",
    ])
    .nullable()
    .optional(),
  reviewNote: z
    .string()
    .max(BATCH_ACTION_LIMITS.NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
});

export type BatchActionValidation = z.infer<
  typeof batchActionValidationSchema
>;

export const BATCH_ACTION_LIMITS_EXPORT = BATCH_ACTION_LIMITS;

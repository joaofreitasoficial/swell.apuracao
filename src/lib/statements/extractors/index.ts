import { GenericRegexAdapter } from "@/lib/statements/extractors/adapters/generic-regex-adapter";
import { OpenAiExtractionAdapter } from "@/lib/statements/extractors/adapters/openai-adapter";
import { normalizeTransactions } from "@/lib/statements/extractors/normalizers";
import type {
  StatementExtractionAdapter,
  StatementExtractionContext,
} from "@/lib/statements/extractors/types";

const adapters: StatementExtractionAdapter[] = [
  new OpenAiExtractionAdapter(),
  new GenericRegexAdapter(),
];

export async function extractTransactionsFromStatement(
  context: StatementExtractionContext,
) {
  let lastError: Error | null = null;

  for (const adapter of adapters) {
    if (!adapter.isAvailable() || !adapter.supports(context)) {
      continue;
    }

    try {
      const result = await adapter.extract(context);

      return {
        ...result,
        transactions: normalizeTransactions(result.transactions),
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Falha desconhecida na extração de transações.");
    }
  }

  if (lastError) {
    throw lastError;
  }

  return {
    adapterName: "none",
    modelName: null,
    transactions: [],
    rawOutput: null,
  };
}

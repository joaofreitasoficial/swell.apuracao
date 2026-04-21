import { CaixaRegexAdapter } from "@/lib/statements/extractors/adapters/caixa-regex-adapter";
import { GeminiExtractionAdapter } from "@/lib/statements/extractors/adapters/gemini-adapter";
import { GenericRegexAdapter } from "@/lib/statements/extractors/adapters/generic-regex-adapter";
import { ItauRegexAdapter } from "@/lib/statements/extractors/adapters/itau-regex-adapter";
import { MercadoPagoRegexAdapter } from "@/lib/statements/extractors/adapters/mercadopago-regex-adapter";
import { NubankRegexAdapter } from "@/lib/statements/extractors/adapters/nubank-regex-adapter";
import { OpenAiExtractionAdapter } from "@/lib/statements/extractors/adapters/openai-adapter";
import { PicPayRegexAdapter } from "@/lib/statements/extractors/adapters/picpay-regex-adapter";
import { normalizeTransactions } from "@/lib/statements/extractors/normalizers";
import type {
  StatementExtractionAdapter,
  StatementExtractionContext,
} from "@/lib/statements/extractors/types";

/**
 * Adapters run in priority order. First adapter that is available, supports
 * the statement, and returns at least one transaction wins.
 *
 * Ordering rationale:
 *   1. Bank-specific regex parsers — free, instant, most accurate for known banks.
 *   2. Gemini — free tier, universal fallback for any bank.
 *   3. OpenAI — paid fallback if Gemini is unavailable or fails.
 *   4. Generic regex — last-resort attempt for well-structured legacy formats.
 */
const adapters: StatementExtractionAdapter[] = [
  new NubankRegexAdapter(),
  new ItauRegexAdapter(),
  new CaixaRegexAdapter(),
  new PicPayRegexAdapter(),
  new MercadoPagoRegexAdapter(),
  new GeminiExtractionAdapter(),
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
      const normalizedTransactions = normalizeTransactions(result.transactions);

      // If the adapter returned no transactions, try the next one — empty
      // extraction usually means this adapter's regex/prompt didn't fit the
      // statement, not that the statement is actually empty.
      if (normalizedTransactions.length === 0) {
        continue;
      }

      return {
        ...result,
        transactions: normalizedTransactions,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Falha desconhecida na extração de transações.");
      // Keep trying the next adapter instead of bailing out. The whole point
      // of chaining adapters is that one failing is survivable.
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

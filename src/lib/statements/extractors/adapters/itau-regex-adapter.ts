import type {
  ExtractedTransactionCandidate,
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
  TransactionDirection,
} from "@/lib/statements/extractors/types";

const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AMOUNT_REGEX = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;
const SKIP_LINE_REGEX = /^(SALDO DO DIA|SALDO ANTERIOR|SALDO|saldo)/i;

function parseAmount(token: string): { amount: number; direction: TransactionDirection } | null {
  const isNegative = token.startsWith("-");
  const cleaned = token.replace(/^-/, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return { amount: Math.abs(parsed), direction: isNegative ? "debit" : "credit" };
}

/**
 * Parses Itaú-formatted statements. Observed layout per transaction:
 *
 *   DD/MM/YYYY                <- date
 *   PIX TRANSF FULANO 12/34   <- description (may span multiple lines)
 *   -187,66                   <- amount (first) = transaction value
 *   1.234,56                  <- amount (second) = running balance (skip)
 *
 * "SALDO DO DIA" lines are informational and must be skipped together with
 * the balance amount that follows them.
 */
export class ItauRegexAdapter implements StatementExtractionAdapter {
  name = "itau_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    if (context.bankName?.toLowerCase().includes("ita")) {
      return true;
    }

    return /\bita[uú]\b/i.test(context.text) || /itau\.com\.br/i.test(context.text);
  }

  async extract(
    context: StatementExtractionContext,
  ): Promise<StatementExtractionAdapterResult> {
    const lines = context.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const transactions: ExtractedTransactionCandidate[] = [];
    let currentDate: string | null = null;
    let descriptionBuffer: string[] = [];
    let skipNextAmount = false;

    for (const line of lines) {
      const dateMatch = line.match(DATE_REGEX);
      if (dateMatch) {
        currentDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        descriptionBuffer = [];
        skipNextAmount = false;
        continue;
      }

      if (SKIP_LINE_REGEX.test(line)) {
        // The balance amount that follows should be discarded.
        descriptionBuffer = [];
        skipNextAmount = true;
        continue;
      }

      if (AMOUNT_REGEX.test(line)) {
        if (skipNextAmount) {
          skipNextAmount = false;
          continue;
        }

        if (!currentDate || descriptionBuffer.length === 0) {
          continue;
        }

        const parsed = parseAmount(line);
        if (!parsed) {
          continue;
        }

        const description = descriptionBuffer.join(" ").replace(/\s+/g, " ").trim();
        if (description.length === 0) {
          descriptionBuffer = [];
          continue;
        }

        transactions.push({
          transactionDate: currentDate,
          description,
          amount: parsed.amount,
          direction: parsed.direction,
          extractionConfidence: 0.9,
          originalText: `${currentDate} ${description} ${line}`.slice(0, 500),
        });

        descriptionBuffer = [];
        // The next amount on this row is the running balance — skip it.
        skipNextAmount = true;
        continue;
      }

      if (currentDate) {
        descriptionBuffer.push(line);
      }
    }

    return {
      adapterName: this.name,
      modelName: null,
      transactions,
      rawOutput: {
        source: "itau-regex-parser",
        totalLines: lines.length,
        transactionCount: transactions.length,
      },
    };
  }
}

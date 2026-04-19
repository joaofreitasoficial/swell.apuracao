import type {
  ExtractedTransactionCandidate,
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
  TransactionDirection,
} from "@/lib/statements/extractors/types";

const MONTH_MAP: Record<string, string> = {
  JAN: "01",
  FEV: "02",
  MAR: "03",
  ABR: "04",
  MAI: "05",
  JUN: "06",
  JUL: "07",
  AGO: "08",
  SET: "09",
  OUT: "10",
  NOV: "11",
  DEZ: "12",
};

const DATE_HEADER_REGEX = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})$/i;
const AMOUNT_REGEX = /^[+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}$/;
const CATEGORY_TOTAL_REGEX = /^(Total de entradas|Total de saídas)[\s+\-]?\s*[+-]?\s*\d/i;

function parseAmountToken(token: string): { amount: number; direction: TransactionDirection } | null {
  const trimmed = token.trim();
  const sign = trimmed.startsWith("-") ? "debit" : "credit";
  const cleaned = trimmed.replace(/^[+-]\s*/, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return { amount: Math.abs(parsed), direction: sign };
}

function inferDirectionFromText(description: string, fallback: TransactionDirection): TransactionDirection {
  const lower = description.toLowerCase();

  if (
    /\b(recebid[ao]|entrada|cr[eé]dito|estorno recebido|dep[oó]sito)\b/.test(lower)
  ) {
    return "credit";
  }

  if (
    /\b(enviad[ao]|pagamento|compra|sa[ií]da|tarifa|d[eé]bito|transfer[eê]ncia enviada|estorno enviado)\b/.test(
      lower,
    )
  ) {
    return "debit";
  }

  return fallback;
}

/**
 * Parses Nubank-formatted statements. Observed layout:
 *
 *   01 SET 2025                       <- date header
 *   Total de entradas+ 92,05          <- section header (skip)
 *   Transferência recebida pelo Pix   <- description line 1
 *   ADRIANA B SILVA - ...             <- description continuation
 *   50,00                             <- amount
 *   Valor                             <- section separator (skip)
 *
 * A single date section can contain multiple transactions. Each transaction
 * ends when we hit an amount line. Descriptions are joined across lines.
 */
export class NubankRegexAdapter implements StatementExtractionAdapter {
  name = "nubank_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    if (context.bankName?.toLowerCase().includes("nubank")) {
      return true;
    }

    return /\bnubank\b/i.test(context.text) || /\bnu pagamentos\b/i.test(context.text);
  }

  async extract(
    context: StatementExtractionContext,
  ): Promise<StatementExtractionAdapterResult> {
    const rawLines = context.text.split(/\r?\n/);
    const lines = rawLines.map((line) => line.trim()).filter((line) => line.length > 0);

    const transactions: ExtractedTransactionCandidate[] = [];
    let currentDate: string | null = null;
    let descriptionBuffer: string[] = [];
    let lastAmountLineWasProcessed = false;

    const flushTransaction = (amountToken: string) => {
      if (!currentDate || descriptionBuffer.length === 0) {
        descriptionBuffer = [];
        return;
      }

      const parsedAmount = parseAmountToken(amountToken);
      if (!parsedAmount) {
        descriptionBuffer = [];
        return;
      }

      const description = descriptionBuffer.join(" ").replace(/\s+/g, " ").trim();

      if (description.length === 0) {
        descriptionBuffer = [];
        return;
      }

      const direction = inferDirectionFromText(description, parsedAmount.direction);

      transactions.push({
        transactionDate: currentDate,
        description,
        amount: parsedAmount.amount,
        direction,
        extractionConfidence: 0.9,
        originalText: `${currentDate} ${description} ${amountToken}`.slice(0, 500),
      });

      descriptionBuffer = [];
    };

    for (const line of lines) {
      const dateMatch = line.match(DATE_HEADER_REGEX);
      if (dateMatch) {
        const day = dateMatch[1];
        const month = MONTH_MAP[dateMatch[2].toUpperCase()];
        const year = dateMatch[3];
        currentDate = `${year}-${month}-${day}`;
        descriptionBuffer = [];
        lastAmountLineWasProcessed = false;
        continue;
      }

      if (CATEGORY_TOTAL_REGEX.test(line)) {
        descriptionBuffer = [];
        continue;
      }

      if (/^Valor\s*$/i.test(line) || /^Movimenta[cç][oõ]es\s*$/i.test(line)) {
        continue;
      }

      if (AMOUNT_REGEX.test(line)) {
        if (!lastAmountLineWasProcessed && descriptionBuffer.length > 0) {
          flushTransaction(line);
          lastAmountLineWasProcessed = true;
        }
        continue;
      }

      // Regular description line.
      if (currentDate) {
        descriptionBuffer.push(line);
        lastAmountLineWasProcessed = false;
      }
    }

    return {
      adapterName: this.name,
      modelName: null,
      transactions,
      rawOutput: {
        source: "nubank-regex-parser",
        totalLines: lines.length,
        transactionCount: transactions.length,
      },
    };
  }
}

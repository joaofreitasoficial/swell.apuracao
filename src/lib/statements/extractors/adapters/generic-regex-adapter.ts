import type {
  ExtractedTransactionCandidate,
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
  TransactionDirection,
} from "@/lib/statements/extractors/types";

function parseBrazilianAmount(rawValue: string) {
  const normalized = rawValue.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function inferDirection(
  line: string,
  amountLabel: string,
): TransactionDirection {
  if (
    /\b(debito|d[eé]bito|sa[ií]da|pagamento|compra|tarifa)\b/i.test(line) ||
    /\-$/.test(amountLabel.trim())
  ) {
    return "debit";
  }

  return "credit";
}

function normalizeDate(rawDate: string) {
  const match = rawDate.match(/(\d{2})[\/.-](\d{2})(?:[\/.-](\d{2,4}))?/);

  if (!match) {
    return null;
  }

  const day = match[1];
  const month = match[2];
  const yearValue = match[3]
    ? match[3].length === 2
      ? `20${match[3]}`
      : match[3]
    : `${new Date().getFullYear()}`;

  return `${yearValue}-${month}-${day}`;
}

function parseLine(line: string): ExtractedTransactionCandidate | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^(\d{2}[\/.-]\d{2}(?:[\/.-]\d{2,4})?)\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}-?)$/,
  );

  if (!match) {
    return null;
  }

  const transactionDate = normalizeDate(match[1]);
  const amount = parseBrazilianAmount(match[3].replace("-", ""));

  if (!transactionDate || !amount) {
    return null;
  }

  return {
    transactionDate,
    description: match[2],
    amount,
    direction: inferDirection(trimmed, match[3]),
    extractionConfidence: 0.61,
    originalText: trimmed,
  };
}

export class GenericRegexAdapter implements StatementExtractionAdapter {
  name = "generic_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    void context;
    return true;
  }

  async extract(
    context: StatementExtractionContext,
  ): Promise<StatementExtractionAdapterResult> {
    const transactions = context.text
      .split(/\r?\n/)
      .map((line) => parseLine(line))
      .filter((candidate): candidate is ExtractedTransactionCandidate => Boolean(candidate));

    return {
      adapterName: this.name,
      modelName: null,
      transactions,
      rawOutput: {
        source: "regex-line-parser",
        totalLines: context.text.split(/\r?\n/).length,
      },
    };
  }
}

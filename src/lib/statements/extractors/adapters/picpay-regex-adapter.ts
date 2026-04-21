import type {
  ExtractedTransactionCandidate,
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
  TransactionDirection,
} from "@/lib/statements/extractors/types";

const MONTH_MAP: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  março: "03",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

const DATE_HEADER_REGEX = /^(\d{1,2})\s+de\s+([a-zçã]+)\s+(?:de\s+)?(\d{4})\s*$/i;
const TIME_REGEX = /^\d{2}:\d{2}(?::\d{2})?$/;
// Valor com sinal unicode (− U+2212 ou - U+002D) ou + : [+−-]R$ 10,00
const AMOUNT_REGEX = /^[+\-\u2212]?\s*R\$\s*-?\d{1,3}(?:\.\d{3})*,\d{2}$/i;
const SKIP_LINE_REGEX =
  /^(Saldo ao final do dia|Hora|Tipo|Origem|Destino|Forma de pagamento|Valor|PicPay|CNPJ|Agência|Conta|CPF|Período|Extrato|Saldo inicial|Saldo final|0800)/i;

function parseAmount(token: string): { amount: number; direction: TransactionDirection } | null {
  const trimmed = token.trim();
  // Normaliza sinal unicode menos (U+2212) para hífen comum.
  const normalized = trimmed.replace(/\u2212/g, "-");
  const isNegative = normalized.startsWith("-");
  const isPositive = normalized.startsWith("+");

  const cleaned = normalized
    .replace(/^[+-]/, "")
    .replace(/R\$\s*/i, "")
    .replace(/^-/, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  let direction: TransactionDirection;
  if (isNegative) {
    direction = "debit";
  } else if (isPositive) {
    direction = "credit";
  } else {
    direction = "credit";
  }

  return { amount: Math.abs(parsed), direction };
}

/**
 * Parses PicPay statements. Observed layout per transaction:
 *
 *   15 de abril 2026                    <- date header (no weekday)
 *   Saldo ao final do dia: R$ 278,57    <- skip
 *   10:23                               <- time
 *   Pix enviado                         <- type (part of description)
 *   Fulano de Tal                       <- counterparty
 *   Com saldo                           <- payment form (optional)
 *   −R$ 10,00                           <- amount (unicode minus for debit)
 *
 *   Credits use +R$ prefix.
 */
export class PicPayRegexAdapter implements StatementExtractionAdapter {
  name = "picpay_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    if (context.bankName?.toLowerCase().includes("picpay")) {
      return true;
    }

    return /\bpicpay\b/i.test(context.text) || /picpay\.com/i.test(context.text);
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

    for (const line of lines) {
      const dateMatch = line.match(DATE_HEADER_REGEX);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, "0");
        const monthKey = dateMatch[2].toLowerCase();
        const month = MONTH_MAP[monthKey];
        const year = dateMatch[3];
        if (month) {
          currentDate = `${year}-${month}-${day}`;
          descriptionBuffer = [];
        }
        continue;
      }

      if (SKIP_LINE_REGEX.test(line)) {
        continue;
      }

      if (TIME_REGEX.test(line)) {
        // Time marks start of a new transaction row — flush any stale buffer.
        descriptionBuffer = [];
        continue;
      }

      if (AMOUNT_REGEX.test(line)) {
        if (!currentDate || descriptionBuffer.length === 0) {
          descriptionBuffer = [];
          continue;
        }

        const parsed = parseAmount(line);
        if (!parsed) {
          descriptionBuffer = [];
          continue;
        }

        // Remove "Com saldo" (forma de pagamento) do final da descrição, é ruído.
        const cleanedBuffer = descriptionBuffer.filter(
          (entry) => !/^(Com saldo|Com cart[aã]o)$/i.test(entry),
        );

        const description = cleanedBuffer.join(" ").replace(/\s+/g, " ").trim();
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
        source: "picpay-regex-parser",
        totalLines: lines.length,
        transactionCount: transactions.length,
      },
    };
  }
}

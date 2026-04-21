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

const DAY_HEADER_REGEX =
  /^(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4}),?\s*([a-zçã\-]+)?\s*$/i;
const DATE_ROW_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const AMOUNT_REGEX = /^-?\d{1,3}(?:\.\d{3})*,\d{2}\s*([CD])?$/;
const SKIP_LINE_REGEX =
  /^(SALDO DIA|SALDO ANTERIOR|SALDO|Data\/Hora|Nr\. Doc|Descri[cç][aã]o|Valor|Detalhamento|Cliente:|Conta:|Ag[êe]ncia:|P[aá]gina|Extrato|#PESSOAL|CAIXA)/i;

function parseAmount(token: string): { amount: number; direction: TransactionDirection } | null {
  const match = token.trim().match(/^(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])?$/);
  if (!match) {
    return null;
  }

  const cleaned = match[1].replace(/^-/, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  const suffix = match[2];
  let direction: TransactionDirection;

  if (suffix === "C") {
    direction = "credit";
  } else if (suffix === "D") {
    direction = "debit";
  } else {
    direction = match[1].startsWith("-") ? "debit" : "credit";
  }

  return { amount: Math.abs(parsed), direction };
}

/**
 * Parses Caixa Econômica #PESSOAL statements. Observed layout:
 *
 *   24 de julho de 2025, quinta-feira     <- day header
 *   24/07/2025                            <- date (DD/MM/YYYY)
 *   18:10:02                              <- time (skip)
 *   999123                                <- document number (skip if numeric-only short)
 *   PIX RECEBIDO                          <- description line 1
 *   CPF: 123.***.***-01                   <- continuation
 *   FULANO DE TAL                         <- continuation
 *   E2E: abc123...                        <- continuation
 *   350,00 C                              <- amount with C/D suffix
 *   1.234,56 C                            <- running balance (skip)
 *   SALDO DIA                             <- footer per day (skip)
 *   1.234,56 C                            <- balance (skip)
 */
export class CaixaRegexAdapter implements StatementExtractionAdapter {
  name = "caixa_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    if (context.bankName?.toLowerCase().includes("caixa")) {
      return true;
    }

    return /caixa econ[oô]mica/i.test(context.text) || /#PESSOAL/i.test(context.text);
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
      const dayHeaderMatch = line.match(DAY_HEADER_REGEX);
      if (dayHeaderMatch) {
        const day = dayHeaderMatch[1].padStart(2, "0");
        const monthKey = dayHeaderMatch[2].toLowerCase();
        const month = MONTH_MAP[monthKey];
        const year = dayHeaderMatch[3];
        if (month) {
          currentDate = `${year}-${month}-${day}`;
          descriptionBuffer = [];
          skipNextAmount = false;
        }
        continue;
      }

      const dateRowMatch = line.match(DATE_ROW_REGEX);
      if (dateRowMatch) {
        currentDate = `${dateRowMatch[3]}-${dateRowMatch[2]}-${dateRowMatch[1]}`;
        descriptionBuffer = [];
        skipNextAmount = false;
        continue;
      }

      if (SKIP_LINE_REGEX.test(line)) {
        if (/^SALDO DIA/i.test(line) || /^SALDO ANTERIOR/i.test(line) || /^SALDO/i.test(line)) {
          descriptionBuffer = [];
          skipNextAmount = true;
        }
        continue;
      }

      // Pure time line (HH:MM:SS) — skip.
      if (/^\d{2}:\d{2}:\d{2}$/.test(line)) {
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
        // The next amount is the running balance.
        skipNextAmount = true;
        continue;
      }

      // Isolated short numeric tokens (document numbers) — ignore as descriptions.
      if (/^\d{1,8}$/.test(line)) {
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
        source: "caixa-regex-parser",
        totalLines: lines.length,
        transactionCount: transactions.length,
      },
    };
  }
}

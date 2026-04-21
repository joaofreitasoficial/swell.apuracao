import type {
  ExtractedTransactionCandidate,
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
  TransactionDirection,
} from "@/lib/statements/extractors/types";

// Data no formato DD-MM-YYYY (característica do Mercado Pago).
const DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
// Valor no formato R$ -68,00 ou R$ 287,17
const AMOUNT_REGEX = /^R\$\s*-?\d{1,3}(?:\.\d{3})*,\d{2}$/i;
// ID de operação: sequência longa de dígitos (10+).
const OPERATION_ID_REGEX = /^\d{10,}$/;
const SKIP_LINE_REGEX =
  /^(Mercado\s*Pago|mercadopago\.com|EXTRATO DE CONTA|DETALHE DOS MOVIMENTOS|Data|Descri[cç][aã]o|ID da opera[cç][aã]o|Valor|Saldo|Periodo|Per[ií]odo|Saldo inicial|Saldo final|Entradas|Saidas|Sa[ií]das|Data de gera[cç][aã]o|CPF|CNPJ|Ag[êe]ncia|Conta|P[aá]gina|\d+\/\d+|Av\. das Na[cç][oõ]es|Voc[eê] tem|Osasco|0800)/i;

function parseAmount(token: string): { amount: number; direction: TransactionDirection } | null {
  const cleaned = token
    .replace(/R\$\s*/i, "")
    .trim();

  const isNegative = cleaned.startsWith("-");
  const normalized = cleaned.replace(/^-/, "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed === 0) {
    return null;
  }

  return {
    amount: Math.abs(parsed),
    direction: isNegative ? "debit" : "credit",
  };
}

/**
 * Parses Mercado Pago statements. Observed layout per transaction:
 *
 *   01-04-2026                          <- date (DD-MM-YYYY)
 *   Pagamento com QR Pix TIM S          <- description line 1
 *   A                                   <- description continuation
 *   152795757344                        <- operation ID (skip)
 *   R$ -68,00                           <- amount
 *   R$ 50,06                            <- running balance (skip)
 *
 * Debits carry explicit "-" inside the R$ string; credits have no sign.
 */
export class MercadoPagoRegexAdapter implements StatementExtractionAdapter {
  name = "mercadopago_regex";

  isAvailable() {
    return true;
  }

  supports(context: StatementExtractionContext) {
    if (context.bankName?.toLowerCase().includes("mercado pago")) {
      return true;
    }

    return (
      /mercado\s*pago/i.test(context.text) || /mercadopago\.com/i.test(context.text)
    );
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
        continue;
      }

      if (OPERATION_ID_REGEX.test(line)) {
        // Operation ID is metadata, not description — skip.
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

      if (currentDate) {
        descriptionBuffer.push(line);
      }
    }

    return {
      adapterName: this.name,
      modelName: null,
      transactions,
      rawOutput: {
        source: "mercadopago-regex-parser",
        totalLines: lines.length,
        transactionCount: transactions.length,
      },
    };
  }
}

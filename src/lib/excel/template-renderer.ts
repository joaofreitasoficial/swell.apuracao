import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

type KeptTransaction = {
  id: string;
  transactionDate: string;
  amount: number;
  monthRef: number;
  yearRef: number;
  bankName: string | null;
  description: string | null;
};

type RenderApuracaoVaziaParams = {
  clientName: string;
  apuracaoName: string;
  generatedAt: Date;
  transactions: KeptTransaction[];
};

const MONTH_LABELS_PT_BR = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

const FIRST_MONTH_COLUMN_INDEX = 4;
const MONTH_HEADER_ROW = 8;
const DATA_START_ROW = 9;
const DATA_END_ROW = 63;
const TOTAL_ROW = 65;
const MONTHS_COUNT_CELL = "K10";

function columnLetter(index: number): string {
  let result = "";
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }

  return result;
}

function buildMonthLabel(monthRef: number, yearRef: number): string {
  const baseLabel = MONTH_LABELS_PT_BR[monthRef - 1] ?? `MES${monthRef}`;
  return `${baseLabel}/${yearRef}`;
}

function groupTransactionsByMonth(transactions: KeptTransaction[]) {
  const grouped = new Map<string, { monthRef: number; yearRef: number; items: KeptTransaction[] }>();

  for (const transaction of transactions) {
    const key = `${transaction.yearRef}-${String(transaction.monthRef).padStart(2, "0")}`;
    const bucket = grouped.get(key);

    if (bucket) {
      bucket.items.push(transaction);
      continue;
    }

    grouped.set(key, {
      monthRef: transaction.monthRef,
      yearRef: transaction.yearRef,
      items: [transaction],
    });
  }

  const sortedKeys = Array.from(grouped.keys()).sort();

  return sortedKeys.map((key) => {
    const bucket = grouped.get(key)!;
    bucket.items.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    return bucket;
  });
}

async function loadTemplateArrayBuffer(): Promise<ArrayBuffer> {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "lib",
    "excel",
    "templates",
    "apuracao-vazia.xlsx",
  );

  const raw = await readFile(templatePath);
  const copy = new ArrayBuffer(raw.byteLength);
  new Uint8Array(copy).set(raw);
  return copy;
}

function collectDistinctBanks(transactions: KeptTransaction[]): string[] {
  const seen = new Set<string>();
  for (const tx of transactions) {
    const name = (tx.bankName ?? "").trim();
    if (name.length > 0) {
      seen.add(name);
    }
  }
  return Array.from(seen);
}

function appendDetailSheet(
  workbook: ExcelJS.Workbook,
  transactions: KeptTransaction[],
) {
  const sheet = workbook.addWorksheet("Detalhamento por banco");

  sheet.columns = [
    { header: "Data", key: "date", width: 12 },
    { header: "Mês/Ano", key: "monthYear", width: 14 },
    { header: "Banco", key: "bank", width: 20 },
    { header: "Descrição", key: "description", width: 60 },
    { header: "Valor", key: "amount", width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };

  const sorted = [...transactions].sort((a, b) => {
    if (a.yearRef !== b.yearRef) return a.yearRef - b.yearRef;
    if (a.monthRef !== b.monthRef) return a.monthRef - b.monthRef;
    return a.transactionDate.localeCompare(b.transactionDate);
  });

  for (const tx of sorted) {
    sheet.addRow({
      date: tx.transactionDate,
      monthYear: buildMonthLabel(tx.monthRef, tx.yearRef),
      bank: tx.bankName ?? "—",
      description: tx.description ?? "",
      amount: Number(tx.amount),
    });
  }

  // Formatação numérica brasileira para a coluna Valor.
  sheet.getColumn("amount").numFmt = '"R$" #,##0.00';
}

export async function renderApuracaoVazia(params: RenderApuracaoVaziaParams): Promise<Uint8Array> {
  const templateArrayBuffer = await loadTemplateArrayBuffer();

  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(templateArrayBuffer as any);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("O template APURAÇÃO VAZIA não possui nenhuma aba.");
  }

  const monthGroups = groupTransactionsByMonth(params.transactions);
  const distinctBanks = collectDistinctBanks(params.transactions);
  const hasMultipleBanks = distinctBanks.length >= 2;

  worksheet.getCell(MONTHS_COUNT_CELL).value = monthGroups.length;

  monthGroups.forEach((group, groupIndex) => {
    const columnIndex = FIRST_MONTH_COLUMN_INDEX + groupIndex;
    const column = columnLetter(columnIndex);

    worksheet.getCell(`${column}${MONTH_HEADER_ROW}`).value = buildMonthLabel(
      group.monthRef,
      group.yearRef,
    );

    const availableRows = DATA_END_ROW - DATA_START_ROW + 1;
    const itemsToRender = group.items.slice(0, availableRows);

    itemsToRender.forEach((transaction, itemIndex) => {
      const targetRow = DATA_START_ROW + itemIndex;
      const cell = worksheet.getCell(`${column}${targetRow}`);
      cell.value = Number(transaction.amount);

      // Comentário com o banco: só anexa quando há múltiplos bancos na apuração,
      // senão polui células sem ganho informacional.
      if (hasMultipleBanks) {
        const bank = transaction.bankName?.trim() || "Banco não identificado";
        cell.note = {
          texts: [{ text: `Banco: ${bank}` }],
          margins: { insetmode: "auto" },
        };
      }
    });

    worksheet.getCell(`${column}${TOTAL_ROW}`).value = {
      formula: `SUM(${column}${DATA_START_ROW}:${column}${DATA_END_ROW})`,
    };
  });

  if (hasMultipleBanks) {
    appendDetailSheet(workbook, params.transactions);
  }

  const outputBuffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(outputBuffer);
}

export function buildApuracaoVaziaFileName(params: {
  clientName: string;
  createdAt: Date;
}) {
  const normalizedClient = params.clientName
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
  const datePart = `${params.createdAt.getFullYear()}${String(
    params.createdAt.getMonth() + 1,
  ).padStart(2, "0")}${String(params.createdAt.getDate()).padStart(2, "0")}`;

  return `APURACAO_${normalizedClient || "CLIENTE"}_${datePart}.xlsx`;
}

export type { KeptTransaction };

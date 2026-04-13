import "server-only";

import { createHash } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ConsolidatedKpis, MonthlySummaryRecord } from "@/types/domain";

type IncludedTransactionRow = {
  id: string;
  apuracao_id: string;
  transaction_date: string;
  amount: number;
  month_ref: number;
  year_ref: number;
};

type MonthlySummaryRow = {
  id: string;
  apuracao_id: string;
  month_ref: number;
  year_ref: number;
  total_included: number;
  entries_count: number;
  created_at: string;
  updated_at: string;
};

function mapMonthlySummary(row: MonthlySummaryRow): MonthlySummaryRecord {
  return {
    id: row.id,
    apuracaoId: row.apuracao_id,
    monthRef: row.month_ref,
    yearRef: row.year_ref,
    totalIncluded: Number(row.total_included),
    entriesCount: row.entries_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildKpis(monthlySummaries: MonthlySummaryRecord[]): ConsolidatedKpis {
  const totalAnnual = monthlySummaries.reduce(
    (sum, summary) => sum + summary.totalIncluded,
    0,
  );
  const entriesCount = monthlySummaries.reduce(
    (sum, summary) => sum + summary.entriesCount,
    0,
  );
  const monthsCount = monthlySummaries.length;
  const averageMonthly = monthsCount > 0 ? totalAnnual / monthsCount : 0;

  const sortedByTotal = [...monthlySummaries].sort(
    (left, right) => right.totalIncluded - left.totalIncluded,
  );

  return {
    totalAnnual,
    averageMonthly,
    highestMonth: sortedByTotal[0] ?? null,
    lowestMonth: sortedByTotal.at(-1) ?? null,
    entriesCount,
    monthsCount,
  };
}

export async function refreshMonthlySummaries(apuracaoId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("transactions")
    .select(
      "id,apuracao_id,transaction_date,amount,month_ref,year_ref,transaction_reviews!inner(decision)",
    )
    .eq("apuracao_id", apuracaoId)
    .eq("transaction_reviews.decision", "manter")
    .returns<Array<IncludedTransactionRow & { transaction_reviews: { decision: string } }>>();

  if (error) {
    throw new Error(`Falha ao carregar transacoes mantidas: ${error.message}`);
  }

  const includedTransactions = (data ?? []).map((transaction) => ({
    id: transaction.id,
    apuracao_id: transaction.apuracao_id,
    transaction_date: transaction.transaction_date,
    amount: Number(transaction.amount),
    month_ref: transaction.month_ref,
    year_ref: transaction.year_ref,
  }));

  const grouped = new Map<
    string,
    {
      monthRef: number;
      yearRef: number;
      totalIncluded: number;
      entriesCount: number;
    }
  >();

  includedTransactions.forEach((transaction) => {
    const key = `${transaction.year_ref}-${String(transaction.month_ref).padStart(2, "0")}`;
    const current = grouped.get(key);

    if (current) {
      current.totalIncluded += transaction.amount;
      current.entriesCount += 1;
      return;
    }

    grouped.set(key, {
      monthRef: transaction.month_ref,
      yearRef: transaction.year_ref,
      totalIncluded: transaction.amount,
      entriesCount: 1,
    });
  });

  const rowsToUpsert = Array.from(grouped.values()).map((summary) => ({
    apuracao_id: apuracaoId,
    month_ref: summary.monthRef,
    year_ref: summary.yearRef,
    total_included: Number(summary.totalIncluded.toFixed(2)),
    entries_count: summary.entriesCount,
  }));

  await admin.from("monthly_summaries").delete().eq("apuracao_id", apuracaoId);

  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await admin.from("monthly_summaries").insert(rowsToUpsert);

    if (upsertError) {
      throw new Error(`Falha ao salvar consolidado mensal: ${upsertError.message}`);
    }
  }

  const { data: refreshedRows, error: refreshedError } = await admin
    .from("monthly_summaries")
    .select(
      "id,apuracao_id,month_ref,year_ref,total_included,entries_count,created_at,updated_at",
    )
    .eq("apuracao_id", apuracaoId)
    .order("year_ref", { ascending: true })
    .order("month_ref", { ascending: true })
    .returns<MonthlySummaryRow[]>();

  if (refreshedError) {
    throw new Error(
      `Falha ao recarregar consolidado mensal: ${refreshedError.message}`,
    );
  }

  const monthlySummaries = (refreshedRows ?? []).map(mapMonthlySummary);
  const kpis = buildKpis(monthlySummaries);
  const snapshotPayload = {
    monthlySummaries,
    kpis,
  };
  const referenceKey = createHash("sha1")
    .update(JSON.stringify(snapshotPayload))
    .digest("hex");

  const { error: snapshotError } = await admin.from("summary_snapshots").insert({
    apuracao_id: apuracaoId,
    reference_key: referenceKey,
    totals: snapshotPayload,
  });

  if (snapshotError) {
    throw new Error(`Falha ao salvar snapshot do consolidado: ${snapshotError.message}`);
  }

  return {
    monthlySummaries,
    kpis,
    latestSnapshotReferenceKey: referenceKey,
  };
}

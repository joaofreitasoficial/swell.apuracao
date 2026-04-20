"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { ReviewDecisionBadge } from "@/components/reviews/review-decision-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { MonthlyCreditBucket } from "@/lib/operations/queries";
import type {
  ReviewDecision,
  ReviewableTransactionRecord,
  TransactionReviewRecord,
} from "@/types/domain";

const MONTH_LABELS_PT_BR = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

function buildShortMonthLabel(monthRef: number, yearRef: number) {
  const base = MONTH_LABELS_PT_BR[monthRef - 1] ?? `M${monthRef}`;
  return `${base}/${yearRef}`;
}

type ReviewMonthsTabProps = {
  apuracaoId: string;
  buckets: MonthlyCreditBucket[];
};

type BucketState = MonthlyCreditBucket;

function cloneBuckets(buckets: MonthlyCreditBucket[]): BucketState[] {
  return buckets.map((bucket) => ({
    ...bucket,
    transactions: bucket.transactions.map((transaction) => ({
      ...transaction,
      review: transaction.review ? { ...transaction.review } : null,
    })),
  }));
}

function recomputeBucket(bucket: BucketState): BucketState {
  let keptTotal = 0;
  let keptCount = 0;
  let pendingCount = 0;
  let excludedCount = 0;

  for (const transaction of bucket.transactions) {
    const decision = transaction.review?.decision ?? "pendente";

    if (decision === "manter") {
      keptTotal += Number(transaction.amount);
      keptCount += 1;
    } else if (decision === "excluir") {
      excludedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  return {
    ...bucket,
    keptTotal,
    keptCount,
    pendingCount,
    excludedCount,
  };
}

export function ReviewMonthsTab({ apuracaoId, buckets }: ReviewMonthsTabProps) {
  const [state, setState] = useState<BucketState[]>(() => cloneBuckets(buckets));
  const [activeKey, setActiveKey] = useState<string | null>(
    () => buildBucketKey(buckets[0]) ?? null,
  );
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const activeBucket = useMemo(() => {
    if (!activeKey) {
      return state[0] ?? null;
    }

    return state.find((bucket) => buildBucketKey(bucket) === activeKey) ?? null;
  }, [state, activeKey]);

  const grandKeptTotal = useMemo(
    () => state.reduce((sum, bucket) => sum + bucket.keptTotal, 0),
    [state],
  );

  async function persistReview(transactionId: string, decision: ReviewDecision) {
    const response = await fetch(`/api/apuracoes/${apuracaoId}/reviews`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionId,
        decision,
        exclusionReason: null,
        reviewNote: null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; review?: TransactionReviewRecord }
      | null;

    if (!response.ok || !payload?.review) {
      throw new Error(payload?.error ?? "Nao foi possivel salvar a revisao.");
    }

    return payload.review;
  }

  function applyLocalDecision(
    transactionId: string,
    decision: ReviewDecision,
    review: TransactionReviewRecord | null,
  ) {
    setState((current) =>
      current.map((bucket) => {
        const matchIndex = bucket.transactions.findIndex(
          (transaction) => transaction.id === transactionId,
        );

        if (matchIndex === -1) {
          return bucket;
        }

        const nextTransactions = bucket.transactions.map((transaction) =>
          transaction.id === transactionId
            ? {
                ...transaction,
                review: review ?? {
                  id: transaction.review?.id ?? `local-${transaction.id}`,
                  transactionId: transaction.id,
                  decision,
                  exclusionReason: null,
                  reviewNote: null,
                  reviewedBy: transaction.review?.reviewedBy ?? null,
                  reviewedAt:
                    decision === "pendente"
                      ? null
                      : transaction.review?.reviewedAt ?? new Date().toISOString(),
                  createdAt: transaction.review?.createdAt ?? new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              }
            : transaction,
        );

        return recomputeBucket({
          ...bucket,
          transactions: nextTransactions,
        });
      }),
    );
  }

  function handleDecisionChange(
    transaction: ReviewableTransactionRecord,
    decision: ReviewDecision,
  ) {
    const previousDecision = transaction.review?.decision ?? "pendente";

    if (previousDecision === decision) {
      return;
    }

    applyLocalDecision(transaction.id, decision, null);
    setSavingIds((current) => ({ ...current, [transaction.id]: true }));

    startTransition(async () => {
      try {
        const review = await persistReview(transaction.id, decision);
        applyLocalDecision(transaction.id, decision, review);
      } catch (error) {
        applyLocalDecision(transaction.id, previousDecision, transaction.review);
        toast.error(
          error instanceof Error ? error.message : "Falha ao salvar revisao.",
        );
      } finally {
        setSavingIds((current) => {
          const next = { ...current };
          delete next[transaction.id];
          return next;
        });
      }
    });
  }

  if (state.length === 0) {
    return (
      <Card className="border-border/70 bg-card/90">
        <CardContent className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
          Nenhum credito (entrada) encontrado nesta apuracao. Envie extratos com
          entradas ou aguarde o pipeline concluir o processamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl tracking-tight">
            Revisao mes a mes
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Selecione um mes para ver apenas as entradas daquele periodo. Marque
            manter ou excluir linha a linha e acompanhe o total aprovado em
            tempo real. Apenas entradas aparecem nesta aba — o Excel final usa
            exatamente esses valores.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {state.map((bucket) => {
              const key = buildBucketKey(bucket);
              const isActive = activeKey === key;
              const label = buildShortMonthLabel(bucket.monthRef, bucket.yearRef);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/70 bg-card/90 hover:border-primary/40",
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(bucket.keptTotal)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {bucket.keptCount} mantidas • {bucket.pendingCount} pendentes
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
            <p className="text-muted-foreground">Total aprovado (todos os meses)</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCurrency(grandKeptTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Esse valor entra no Excel APURAÇÃO VAZIA como soma das colunas mensais.
            </p>
          </div>
        </CardContent>
      </Card>

      {activeBucket ? (
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl tracking-tight">
              {buildShortMonthLabel(activeBucket.monthRef, activeBucket.yearRef)} •
              {" "}
              {formatCurrency(activeBucket.keptTotal)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {activeBucket.transactions.length} entradas identificadas •{" "}
              {activeBucket.keptCount} mantidas •{" "}
              {activeBucket.pendingCount} pendentes •{" "}
              {activeBucket.excludedCount} excluidas
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Decisao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBucket.transactions.map((transaction) => {
                  const decision = transaction.review?.decision ?? "pendente";
                  const isSaving = Boolean(savingIds[transaction.id]);

                  return (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        decision === "excluir" && "opacity-60",
                      )}
                    >
                      <TableCell className="align-top">
                        {formatDate(transaction.transactionDate)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium leading-snug">
                            {transaction.description}
                          </p>
                          {transaction.isDuplicate ? (
                            <Badge variant="destructive">Duplicada</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {transaction.bankName}
                      </TableCell>
                      <TableCell className="align-top text-right font-medium">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={decision === "manter" ? "default" : "outline"}
                              disabled={isSaving}
                              onClick={() =>
                                handleDecisionChange(transaction, "manter")
                              }
                            >
                              Manter
                            </Button>
                            <Button
                              size="sm"
                              variant={decision === "excluir" ? "destructive" : "outline"}
                              disabled={isSaving}
                              onClick={() =>
                                handleDecisionChange(transaction, "excluir")
                              }
                            >
                              Excluir
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ReviewDecisionBadge decision={decision} />
                            {isSaving ? (
                              <LoaderCircle className="size-3 animate-spin" />
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function buildBucketKey(bucket: MonthlyCreditBucket | undefined) {
  if (!bucket) {
    return null;
  }

  return `${bucket.yearRef}-${String(bucket.monthRef).padStart(2, "0")}`;
}

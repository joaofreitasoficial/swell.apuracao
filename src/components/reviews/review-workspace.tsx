"use client";

import {
  type RowSelectionState,
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileSpreadsheet,
  Filter,
  History,
  LoaderCircle,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { ReviewConsolidatedTab } from "@/components/reviews/review-consolidated-tab";
import { ReviewLogsDrawer } from "@/components/reviews/review-logs-drawer";
import { ReviewMonthsTab } from "@/components/reviews/review-months-tab";
import {
  exclusionReasonOptions,
  getMonthYearLabel,
} from "@/components/reviews/review-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { MonthlyCreditBucket } from "@/lib/operations/queries";
import type {
  AuditLogRecord,
  ConsolidatedKpis,
  ExclusionReason,
  MonthlySummaryRecord,
  PaginationMeta,
  ReviewDecision,
  ReviewWorkspaceCounts,
  ReviewWorkspaceDuplicateFilter,
  ReviewWorkspaceFilterOptions,
  ReviewWorkspaceFilters,
  ReviewWorkspaceTab,
  ReviewableTransactionRecord,
  TransactionReviewRecord,
} from "@/types/domain";

const columnHelper = createColumnHelper<ReviewableTransactionRecord>();
const gridTemplateColumns =
  "44px 104px minmax(320px,1fr) 132px 220px";
const rowHeight = 58;

const inlineSelectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ReviewSnapshot = {
  transactionId: string;
  decision: ReviewDecision;
  exclusionReason: ExclusionReason | null;
  reviewNote: string | null;
};

type UndoAction = {
  label: string;
  snapshots: ReviewSnapshot[];
};

type ReviewWorkspaceProps = {
  apuracaoId: string;
  apuracaoName: string;
  clientName: string | undefined;
  activeTab: ReviewWorkspaceTab;
  initialFilters: ReviewWorkspaceFilters;
  counts: ReviewWorkspaceCounts;
  filterOptions: ReviewWorkspaceFilterOptions;
  initialTransactions: ReviewableTransactionRecord[];
  pagination: PaginationMeta | null;
  auditLogs: AuditLogRecord[];
  consolidated:
    | {
        monthlySummaries: MonthlySummaryRecord[];
        kpis: ConsolidatedKpis;
        latestSnapshotReferenceKey: string;
      }
    | null;
  monthlyBuckets: MonthlyCreditBucket[] | null;
};

function getSortIcon(direction: false | "asc" | "desc") {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5" />;
  }

  return <ArrowUpDown className="size-3.5" />;
}

function normalizeReviewNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function getSnapshot(transaction: ReviewableTransactionRecord): ReviewSnapshot {
  return {
    transactionId: transaction.id,
    decision: transaction.review?.decision ?? "pendente",
    exclusionReason: transaction.review?.exclusionReason ?? null,
    reviewNote: normalizeReviewNote(transaction.review?.reviewNote ?? null),
  };
}

function buildReviewRecord(
  transaction: ReviewableTransactionRecord,
  snapshot: ReviewSnapshot,
): TransactionReviewRecord {
  const existing = transaction.review;
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? `local-${transaction.id}`,
    transactionId: transaction.id,
    decision: snapshot.decision,
    exclusionReason:
      snapshot.decision === "excluir" ? snapshot.exclusionReason ?? null : null,
    reviewNote: normalizeReviewNote(snapshot.reviewNote),
    reviewedBy: snapshot.decision === "pendente" ? null : existing?.reviewedBy ?? null,
    reviewedAt: snapshot.decision === "pendente" ? null : existing?.reviewedAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function isEditableElement(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function ReviewWorkspace({
  apuracaoId,
  apuracaoName,
  clientName,
  activeTab,
  initialFilters,
  counts,
  filterOptions,
  initialTransactions,
  pagination,
  auditLogs,
  consolidated,
  monthlyBuckets,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [transactions, setTransactions] = useState(initialTransactions);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transactionDate", desc: true },
  ]);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialFilters.query);
  const [month, setMonth] = useState<number | null>(initialFilters.month);
  const [year, setYear] = useState<number | null>(initialFilters.year);
  const [direction, setDirection] = useState<"all" | "credit" | "debit">(
    initialFilters.direction,
  );
  const [duplicate, setDuplicate] = useState<ReviewWorkspaceDuplicateFilter>(
    initialFilters.duplicate,
  );
  const [logsOpen, setLogsOpen] = useState(activeTab === "logs");
  const [isApplyingBatch, startBatchTransition] = useTransition();
  const [isUndoing, startUndoTransition] = useTransition();
  const [batchReason, setBatchReason] =
    useState<"" | ExclusionReason>("");

  const selectedTransactionIds = Object.entries(rowSelection)
    .filter(([, selected]) => Boolean(selected))
    .map(([transactionId]) => transactionId);

  function buildHref(next: Partial<ReviewWorkspaceFilters>) {
    const params = new URLSearchParams();
    const tab = next.tab ?? activeTab;
    const nextQuery = next.query ?? query;
    const nextMonth = next.month ?? month;
    const nextYear = next.year ?? year;
    const nextDirection = next.direction ?? direction;
    const nextDuplicate = next.duplicate ?? duplicate;
    const nextPage = next.page ?? initialFilters.page;

    params.set("tab", tab);

    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    if (nextMonth) {
      params.set("month", String(nextMonth));
    }

    if (nextYear) {
      params.set("year", String(nextYear));
    }

    if (nextDirection !== "all") {
      params.set("direction", nextDirection);
    }

    if (nextDuplicate !== "all") {
      params.set("duplicate", nextDuplicate);
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function navigate(next: Partial<ReviewWorkspaceFilters>) {
    router.push(buildHref(next));
  }

  function applyFilters() {
    navigate({
      page: 1,
      query,
      month,
      year,
      direction,
      duplicate,
    });
  }

  function clearFilters() {
    setQuery("");
    setMonth(null);
    setYear(null);
    setDirection("all");
    setDuplicate("all");
    navigate({
      page: 1,
      query: "",
      month: null,
      year: null,
      direction: "all",
      duplicate: "all",
    });
  }

  function openTab(tab: ReviewWorkspaceTab) {
    navigate({
      tab,
      page: 1,
    });
  }

  const setSaving = (transactionIds: string[], isSaving: boolean) => {
    setSavingIds((current) => {
      const next = { ...current };

      transactionIds.forEach((transactionId) => {
        if (isSaving) {
          next[transactionId] = true;
        } else {
          delete next[transactionId];
        }
      });

      return next;
    });
  };

  useEffect(() => {
    setTransactions(initialTransactions);
    setRowSelection({});
  }, [initialTransactions]);

  useEffect(() => {
    setQuery(initialFilters.query);
    setMonth(initialFilters.month);
    setYear(initialFilters.year);
    setDirection(initialFilters.direction);
    setDuplicate(initialFilters.duplicate);
  }, [initialFilters]);

  useEffect(() => {
    setLogsOpen(activeTab === "logs");
  }, [activeTab]);

  function applySnapshotsLocally(snapshots: ReviewSnapshot[]) {
    const snapshotMap = new Map(
      snapshots.map((snapshot) => [snapshot.transactionId, snapshot]),
    );

    setTransactions((current) =>
      current.map((transaction) => {
        const snapshot = snapshotMap.get(transaction.id);

        if (!snapshot) {
          return transaction;
        }

        return {
          ...transaction,
          review: buildReviewRecord(transaction, snapshot),
        };
      }),
    );
  }

  function syncServerReview(review: TransactionReviewRecord) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === review.transactionId
          ? {
              ...transaction,
              review,
            }
          : transaction,
      ),
    );
  }

  async function persistSingleReview(snapshot: ReviewSnapshot) {
    const response = await fetch(`/api/apuracoes/${apuracaoId}/reviews`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; review?: TransactionReviewRecord }
      | null;

    if (!response.ok || !payload?.review) {
      throw new Error(payload?.error ?? "Nao foi possivel salvar a revisao.");
    }

    return payload.review;
  }

  async function persistBatchReview(params: {
    transactionIds: string[];
    decision: ReviewDecision;
    exclusionReason: ExclusionReason | null;
    reviewNote: string | null;
  }) {
    const response = await fetch(`/api/apuracoes/${apuracaoId}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Nao foi possivel aplicar a acao em lote.");
    }
  }

  function findTransaction(transactionId: string) {
    return transactions.find((transaction) => transaction.id === transactionId) ?? null;
  }

  async function applySingleAction(params: {
    transactionId: string;
    nextSnapshot: ReviewSnapshot;
    previousSnapshot: ReviewSnapshot;
    successMessage: string;
  }) {
    applySnapshotsLocally([params.nextSnapshot]);
    setSaving([params.transactionId], true);
    setLastAction({
      label: params.successMessage,
      snapshots: [params.previousSnapshot],
    });

    try {
      const review = await persistSingleReview(params.nextSnapshot);
      syncServerReview(review);
    } catch (error) {
      applySnapshotsLocally([params.previousSnapshot]);
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar revisao.",
      );
    } finally {
      setSaving([params.transactionId], false);
    }
  }

  function handleDecisionChange(transactionId: string, decision: ReviewDecision) {
    const transaction = findTransaction(transactionId);

    if (!transaction) {
      return;
    }

    const previousSnapshot = getSnapshot(transaction);

    if (previousSnapshot.decision === decision) {
      return;
    }

    const nextSnapshot: ReviewSnapshot = {
      transactionId,
      decision,
      exclusionReason:
        decision === "excluir" ? previousSnapshot.exclusionReason : null,
      reviewNote: previousSnapshot.reviewNote,
    };

    void applySingleAction({
      transactionId,
      nextSnapshot,
      previousSnapshot,
      successMessage: "Decisao atualizada.",
    });
  }

  function applyBatchDecision(decision: ReviewDecision) {
    if (selectedTransactionIds.length === 0) {
      toast.error("Selecione ao menos uma linha.");
      return;
    }

    startBatchTransition(async () => {
      const previousSnapshots = selectedTransactionIds
        .map((transactionId) => findTransaction(transactionId))
        .filter((transaction): transaction is ReviewableTransactionRecord =>
          Boolean(transaction),
        )
        .map(getSnapshot);

      const nextSnapshots = previousSnapshots.map((snapshot) => ({
        ...snapshot,
        decision,
        exclusionReason:
          decision === "excluir" ? batchReason || null : null,
      }));

      applySnapshotsLocally(nextSnapshots);
      setSaving(selectedTransactionIds, true);
      setLastAction({
        label: "Acao em lote aplicada.",
        snapshots: previousSnapshots,
      });

      try {
        await persistBatchReview({
          transactionIds: selectedTransactionIds,
          decision,
          exclusionReason: decision === "excluir" ? batchReason || null : null,
          reviewNote: null,
        });
        toast.success(`${previousSnapshots.length} linhas atualizadas.`);
        setRowSelection({});
      } catch (error) {
        applySnapshotsLocally(previousSnapshots);
        toast.error(
          error instanceof Error ? error.message : "Falha na acao em lote.",
        );
      } finally {
        setSaving(selectedTransactionIds, false);
      }
    });
  }

  function handleUndo() {
    if (!lastAction) {
      return;
    }

    startUndoTransition(async () => {
      applySnapshotsLocally(lastAction.snapshots);
      setSaving(
        lastAction.snapshots.map((snapshot) => snapshot.transactionId),
        true,
      );

      try {
        const reviews = await Promise.all(
          lastAction.snapshots.map((snapshot) => persistSingleReview(snapshot)),
        );

        reviews.forEach(syncServerReview);
        toast.success("Ultima acao desfeita.");
        setLastAction(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Falha ao desfazer a acao.",
        );
      } finally {
        setSaving(
          lastAction.snapshots.map((snapshot) => snapshot.transactionId),
          false,
        );
      }
    });
  }

  const handleShortcuts = useEffectEvent((event: KeyboardEvent) => {
    if (
      isEditableElement(event.target) &&
      !(event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey))
    ) {
      return;
    }

    if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleUndo();
      return;
    }

    const targetIds =
      selectedTransactionIds.length > 0
        ? selectedTransactionIds
        : focusedTransactionId
          ? [focusedTransactionId]
          : [];

    if (targetIds.length === 0) {
      return;
    }

    const shortcutMap: Partial<Record<string, ReviewDecision>> = {
      m: "manter",
      e: "excluir",
      p: "pendente",
    };

    const decision = shortcutMap[event.key.toLowerCase()];

    if (!decision) {
      return;
    }

    event.preventDefault();

    if (targetIds.length === 1) {
      handleDecisionChange(targetIds[0], decision);
      return;
    }

    startBatchTransition(async () => {
      const previousSnapshots = targetIds
        .map((transactionId) => findTransaction(transactionId))
        .filter((transaction): transaction is ReviewableTransactionRecord =>
          Boolean(transaction),
        )
        .map(getSnapshot);

      const nextSnapshots = previousSnapshots.map((snapshot) => ({
        ...snapshot,
        decision,
        exclusionReason: decision === "excluir" ? snapshot.exclusionReason : null,
      }));

      applySnapshotsLocally(nextSnapshots);
      setSaving(targetIds, true);
      setLastAction({
        label: "Atalho aplicado em lote.",
        snapshots: previousSnapshots,
      });

      try {
        await persistBatchReview({
          transactionIds: targetIds,
          decision,
          exclusionReason: decision === "excluir" ? batchReason || null : null,
          reviewNote: null,
        });
        toast.success("Atalho aplicado.");
      } catch (error) {
        applySnapshotsLocally(previousSnapshots);
        toast.error(
          error instanceof Error ? error.message : "Falha ao aplicar atalho.",
        );
      } finally {
        setSaving(targetIds, false);
      }
    });
  });

  useEffect(() => {
    window.addEventListener("keydown", handleShortcuts);
    return () => {
      window.removeEventListener("keydown", handleShortcuts);
    };
  }, []);

  const columns = [
    columnHelper.display({
      id: "select",
      enableSorting: false,
      header: ({ table }) => (
        <input
          aria-label="Selecionar pagina"
          type="checkbox"
          className="size-4"
          checked={table.getIsAllRowsSelected()}
          ref={(element) => {
            if (element) {
              element.indeterminate = table.getIsSomeRowsSelected();
            }
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          aria-label="Selecionar linha"
          type="checkbox"
          className="size-4"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    }),
    columnHelper.accessor("transactionDate", {
      id: "transactionDate",
      header: "Data",
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className="text-sm font-medium">
            {formatDate(row.original.transactionDate)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {getMonthYearLabel(row.original.monthRef, row.original.yearRef)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      id: "description",
      header: "Descricao",
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-1">
          <p className="line-clamp-1 text-sm font-medium" title={row.original.description}>
            {row.original.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">{row.original.bankName}</span>
            {row.original.isDuplicate ? (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                Duplicada
              </Badge>
            ) : null}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("amount", {
      id: "amount",
      header: "Valor",
      cell: ({ row }) => {
        const isCredit = row.original.direction === "credit";
        return (
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {isCredit ? "+" : "-"}{formatCurrency(row.original.amount)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isCredit ? "Entrada" : "Saida"}
            </p>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "decision",
      header: "Decisao",
      cell: ({ row }) => {
        const decision = row.original.review?.decision ?? "pendente";
        const isSaving = Boolean(savingIds[row.original.id]);

        return (
          <div
            className="flex items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <DecisionPill
              label="Manter"
              active={decision === "manter"}
              tone="success"
              disabled={isSaving}
              onClick={() => handleDecisionChange(row.original.id, "manter")}
            />
            <DecisionPill
              label="Excluir"
              active={decision === "excluir"}
              tone="danger"
              disabled={isSaving}
              onClick={() => handleDecisionChange(row.original.id, "excluir")}
            />
            <DecisionPill
              label="?"
              active={decision === "pendente"}
              tone="neutral"
              disabled={isSaving}
              onClick={() => handleDecisionChange(row.original.id, "pendente")}
            />
            {isSaving ? (
              <LoaderCircle className="ml-1 size-3 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const tabItems: Array<{
    id: ReviewWorkspaceTab;
    label: string;
    count?: number;
  }> = [
    { id: "pendentes", label: "Pendentes", count: counts.pendentes },
    { id: "mantidas", label: "Mantidas", count: counts.mantidas },
    { id: "excluidas", label: "Excluidas", count: counts.excluidas },
    { id: "meses", label: "Por mes" },
    { id: "consolidado", label: "Consolidado" },
    { id: "logs", label: "Logs" },
  ];

  const hasActiveFilter =
    query.trim() !== "" ||
    month !== null ||
    year !== null ||
    direction !== "all" ||
    duplicate !== "all";

  const showGrid =
    activeTab !== "consolidado" &&
    activeTab !== "logs" &&
    activeTab !== "meses";

  return (
    <>
      <ReviewLogsDrawer
        auditLogs={auditLogs}
        open={logsOpen}
        onOpenChange={setLogsOpen}
      />

      <div className="flex flex-1 flex-col gap-4 pb-24">
        {/* COMPACT HEADER */}
        <header className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              Revisao • {apuracaoName}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {clientName ?? "Sem cliente vinculado"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <KpiInline label="Total" value={counts.total} tone="default" />
            <KpiInline label="Pendentes" value={counts.pendentes} tone="muted" />
            <KpiInline label="Mantidas" value={counts.mantidas} tone="success" />
            <KpiInline label="Excluidas" value={counts.excluidas} tone="danger" />

            <div className="ml-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogsOpen(true)}
              >
                <History className="size-4" />
                Logs
              </Button>
              <Button
                size="sm"
                render={<Link href={appRouteBuilders.apuracaoExcel(apuracaoId)} />}
              >
                <FileSpreadsheet className="size-4" />
                Excel
              </Button>
            </div>
          </div>
        </header>

        {/* TABS */}
        <div className="flex flex-wrap items-center gap-1 border-b pb-2">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => openTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {activeTab === "meses" ? (
          <ReviewMonthsTab
            apuracaoId={apuracaoId}
            buckets={monthlyBuckets ?? []}
          />
        ) : activeTab === "consolidado" ? (
          consolidated ? (
            <ReviewConsolidatedTab
              monthlySummaries={consolidated.monthlySummaries}
              kpis={consolidated.kpis}
              snapshotReferenceKey={consolidated.latestSnapshotReferenceKey}
            />
          ) : (
            <div className="rounded-xl border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              Nenhum consolidado disponivel ainda. Aprove as entradas na revisao
              para preencher esta aba.
            </div>
          )
        ) : activeTab === "logs" ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card/60 p-10 text-center">
            <History className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              Os logs abrem em drawer lateral para nao poluir a revisao.
            </p>
            <Button size="sm" onClick={() => setLogsOpen(true)}>
              Abrir logs
            </Button>
          </div>
        ) : (
          <>
            {/* INLINE FILTERS */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Filter className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="Buscar descricao, banco ou conta"
                  className="pl-9"
                />
              </div>

              <select
                className={inlineSelectClass}
                value={month ?? "all"}
                onChange={(event) =>
                  setMonth(
                    event.target.value === "all" ? null : Number(event.target.value),
                  )
                }
              >
                <option value="all">Todos os meses</option>
                {filterOptions.months.map((option) => (
                  <option key={option} value={option}>
                    Mes {String(option).padStart(2, "0")}
                  </option>
                ))}
              </select>

              <select
                className={inlineSelectClass}
                value={year ?? "all"}
                onChange={(event) =>
                  setYear(
                    event.target.value === "all" ? null : Number(event.target.value),
                  )
                }
              >
                <option value="all">Todos os anos</option>
                {filterOptions.years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                className={inlineSelectClass}
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as "all" | "credit" | "debit")
                }
              >
                <option value="all">Credito + Debito</option>
                <option value="credit">So credito</option>
                <option value="debit">So debito</option>
              </select>

              <select
                className={inlineSelectClass}
                value={duplicate}
                onChange={(event) =>
                  setDuplicate(
                    event.target.value as ReviewWorkspaceDuplicateFilter,
                  )
                }
              >
                <option value="all">Todas</option>
                <option value="only">So duplicadas</option>
                <option value="hide">Sem duplicadas</option>
              </select>

              <Button size="sm" onClick={applyFilters}>
                Aplicar
              </Button>
              {hasActiveFilter ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-3.5" />
                  Limpar
                </Button>
              ) : null}
            </div>

            {/* TABLE */}
            {showGrid ? (
              <div className="overflow-hidden rounded-xl border bg-card/60">
                <div
                  ref={scrollRef}
                  className="h-[calc(100vh-280px)] min-h-[420px] overflow-auto"
                >
                  <div className="min-w-[820px]">
                    <div className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <div
                          key={headerGroup.id}
                          className="grid items-center gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                          style={{ gridTemplateColumns }}
                        >
                          {headerGroup.headers.map((header) => (
                            <button
                              key={header.id}
                              type="button"
                              className={cn(
                                "flex items-center gap-1.5 text-left",
                                header.column.getCanSort()
                                  ? "cursor-pointer"
                                  : "cursor-default",
                                header.column.id === "amount" && "justify-end",
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                              {header.column.getCanSort()
                                ? getSortIcon(header.column.getIsSorted())
                                : null}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>

                    {rows.length > 0 ? (
                      <div
                        className="relative"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const row = rows[virtualRow.index];
                          const isSelected = row.getIsSelected();
                          const isFocused = focusedTransactionId === row.original.id;

                          return (
                            <div
                              key={row.id}
                              className={cn(
                                "absolute left-0 top-0 w-full",
                                isSelected ? "bg-primary/5" : "",
                              )}
                              style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <div
                                className={cn(
                                  "grid h-full items-center gap-3 border-b px-4 text-sm transition-colors hover:bg-muted/30",
                                  isFocused ? "ring-1 ring-inset ring-primary/40" : "",
                                )}
                                style={{ gridTemplateColumns }}
                                onClick={() =>
                                  setFocusedTransactionId(row.original.id)
                                }
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <div
                                    key={cell.id}
                                    className={cn(
                                      "min-w-0",
                                      cell.column.id === "amount" && "text-right",
                                    )}
                                  >
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                        Nenhuma transacao encontrada para os filtros atuais.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* PAGINATION */}
            {pagination ? (
              <div className="flex items-center justify-between rounded-xl border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
                <span>
                  Pagina {pagination.page} de {pagination.totalPages} •{" "}
                  {pagination.totalItems} registros
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => navigate({ page: pagination.page - 1 })}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => navigate({ page: pagination.page + 1 })}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* FLOATING BATCH TOOLBAR */}
      {selectedTransactionIds.length > 0 && showGrid ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium">
              {selectedTransactionIds.length} selecionadas
            </span>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              disabled={isApplyingBatch}
              onClick={() => applyBatchDecision("manter")}
            >
              Manter
            </Button>
            <select
              className={cn(inlineSelectClass, "h-8")}
              value={batchReason}
              onChange={(event) =>
                setBatchReason(event.target.value as "" | ExclusionReason)
              }
            >
              <option value="">Motivo (opcional)</option>
              {exclusionReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="destructive"
              disabled={isApplyingBatch}
              onClick={() => applyBatchDecision("excluir")}
            >
              Excluir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isApplyingBatch}
              onClick={() => applyBatchDecision("pendente")}
            >
              Pendente
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              disabled={!lastAction || isUndoing}
              onClick={handleUndo}
            >
              <Undo2 className="size-4" />
              Desfazer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DecisionPill({
  label,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "success" | "danger" | "neutral";
  disabled: boolean;
  onClick: () => void;
}) {
  const activeClass =
    tone === "success"
      ? "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600"
      : tone === "danger"
        ? "bg-red-500 text-white hover:bg-red-600 dark:bg-red-600"
        : "bg-muted text-foreground";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        active
          ? activeClass
          : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function KpiInline({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "muted" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "danger"
        ? "text-red-600 dark:text-red-400"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-lg font-semibold tabular-nums", valueClass)}>
        {value}
      </span>
    </div>
  );
}


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
  CheckCircle2,
  CircleSlash,
  FileSpreadsheet,
  Files,
  History,
  LoaderCircle,
  Rows3,
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
import { ReviewDecisionBadge } from "@/components/reviews/review-decision-badge";
import { ReviewLogsDrawer } from "@/components/reviews/review-logs-drawer";
import {
  exclusionReasonOptions,
  getExclusionReasonLabel,
  getMonthYearLabel,
} from "@/components/reviews/review-labels";
import { ReviewSidebar } from "@/components/reviews/review-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
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
  "52px 120px minmax(340px,2.3fr) 150px 150px 130px 150px 180px minmax(220px,1.2fr)";
const rowHeight = 84;
const nativeSelectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
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
  const [batchDecision, setBatchDecision] = useState<ReviewDecision>("manter");
  const [batchReason, setBatchReason] = useState<"" | ExclusionReason>("");
  const [batchNote, setBatchNote] = useState("");
  const [logsOpen, setLogsOpen] = useState(activeTab === "logs");
  const [isApplyingBatch, startBatchTransition] = useTransition();
  const [isUndoing, startUndoTransition] = useTransition();

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
    setNoteDrafts({});
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
      toast.success(params.successMessage);
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

  function handleReasonChange(
    transactionId: string,
    exclusionReason: ExclusionReason | null,
  ) {
    const transaction = findTransaction(transactionId);

    if (!transaction) {
      return;
    }

    const previousSnapshot = getSnapshot(transaction);
    const nextSnapshot: ReviewSnapshot = {
      ...previousSnapshot,
      exclusionReason,
      decision:
        previousSnapshot.decision === "pendente"
          ? "excluir"
          : previousSnapshot.decision,
    };

    void applySingleAction({
      transactionId,
      nextSnapshot,
      previousSnapshot,
      successMessage: "Motivo atualizado.",
    });
  }

  function commitNoteEdit(transactionId: string) {
    const transaction = findTransaction(transactionId);

    if (!transaction) {
      return;
    }

    const draft = noteDrafts[transactionId];

    if (typeof draft !== "string") {
      return;
    }

    const previousSnapshot = getSnapshot(transaction);
    const normalizedDraft = normalizeReviewNote(draft);

    if (normalizedDraft === previousSnapshot.reviewNote) {
      setNoteDrafts((current) => {
        const next = { ...current };
        delete next[transactionId];
        return next;
      });
      return;
    }

    const nextSnapshot: ReviewSnapshot = {
      ...previousSnapshot,
      reviewNote: normalizedDraft,
    };

    setNoteDrafts((current) => {
      const next = { ...current };
      delete next[transactionId];
      return next;
    });

    void applySingleAction({
      transactionId,
      nextSnapshot,
      previousSnapshot,
      successMessage: "Observacao salva.",
    });
  }

  function handleBatchApply() {
    if (selectedTransactionIds.length === 0) {
      toast.error("Selecione pelo menos uma linha para aplicar em lote.");
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
        decision: batchDecision,
        exclusionReason: batchDecision === "excluir" ? batchReason || null : null,
        reviewNote: normalizeReviewNote(batchNote),
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
          decision: batchDecision,
          exclusionReason: batchDecision === "excluir" ? batchReason || null : null,
          reviewNote: normalizeReviewNote(batchNote),
        });
        toast.success("Acao em lote aplicada com sucesso.");
        setBatchNote("");
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
        toast.success("Atalho aplicado com sucesso.");
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
        <div className="flex items-center justify-center">
          <input
            aria-label="Selecionar linhas da pagina"
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(element) => {
              if (element) {
                element.indeterminate = table.getIsSomeRowsSelected();
              }
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <input
            aria-label={`Selecionar transacao ${row.original.description}`}
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ),
    }),
    columnHelper.accessor("transactionDate", {
      id: "transactionDate",
      header: "Data",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{formatDate(row.original.transactionDate)}</p>
          <p className="text-xs text-muted-foreground">
            {getMonthYearLabel(row.original.monthRef, row.original.yearRef)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      id: "description",
      header: "Descricao",
      cell: ({ row }) => (
        <div className="space-y-2">
          <p className="line-clamp-2 whitespace-normal font-medium">
            {row.original.description}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={row.original.direction === "credit" ? "default" : "outline"}>
              {row.original.direction === "credit" ? "Credito" : "Debito"}
            </Badge>
            {row.original.isDuplicate ? (
              <Badge variant="destructive">Duplicada</Badge>
            ) : null}
            <Badge variant="secondary">
              {Math.round(row.original.extractionConfidence * 100)}% IA
            </Badge>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor("bankName", {
      id: "bankName",
      header: "Banco",
      cell: ({ row }) => row.original.bankName,
    }),
    columnHelper.accessor("accountLabel", {
      id: "accountLabel",
      header: "Conta",
      cell: ({ row }) => row.original.accountLabel ?? "Nao identificado",
    }),
    columnHelper.accessor("amount", {
      id: "amount",
      header: "Valor",
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.amount)}</span>
      ),
    }),
    columnHelper.display({
      id: "decision",
      header: "Status",
      cell: ({ row }) => {
        const decision = row.original.review?.decision ?? "pendente";
        const isSaving = Boolean(savingIds[row.original.id]);

        return (
          <div className="space-y-2">
            <select
              className={nativeSelectClassName}
              value={decision}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                handleDecisionChange(
                  row.original.id,
                  event.target.value as ReviewDecision,
                )
              }
            >
              <option value="manter">Manter</option>
              <option value="excluir">Excluir</option>
              <option value="pendente">Pendente</option>
            </select>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ReviewDecisionBadge decision={decision} />
              {isSaving ? <LoaderCircle className="size-3 animate-spin" /> : null}
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "exclusionReason",
      header: "Motivo",
      cell: ({ row }) => {
        const decision = row.original.review?.decision ?? "pendente";
        const exclusionReason = row.original.review?.exclusionReason ?? "";

        return (
          <div className="space-y-2">
            <select
              className={nativeSelectClassName}
              value={exclusionReason}
              disabled={decision !== "excluir"}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                handleReasonChange(
                  row.original.id,
                  (event.target.value || null) as ExclusionReason | null,
                )
              }
            >
              <option value="">Sem motivo</option>
              {exclusionReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="text-xs text-muted-foreground">
              {decision === "excluir"
                ? getExclusionReasonLabel(
                    row.original.review?.exclusionReason ?? null,
                  )
                : "Disponivel apenas para linhas excluidas."}
            </p>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "reviewNote",
      header: "Observacao",
      cell: ({ row }) => {
        const draftValue =
          noteDrafts[row.original.id] ?? row.original.review?.reviewNote ?? "";

        return (
          <Input
            value={draftValue}
            placeholder="Justificativa operacional"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              setNoteDrafts((current) => ({
                ...current,
                [row.original.id]: event.target.value,
              }))
            }
            onBlur={() => commitNoteEdit(row.original.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitNoteEdit(row.original.id);
              }
            }}
          />
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

  function getPinnedStyles(columnId: string, isHeader = false) {
    if (columnId === "select") {
      return {
        className: cn(
          "sticky left-0 z-10",
          isHeader ? "bg-card/95" : "bg-card",
        ),
        style: {
          left: 0,
        },
      };
    }

    if (columnId === "transactionDate") {
      return {
        className: cn(
          "sticky z-10 border-r border-border/70",
          isHeader ? "bg-card/95" : "bg-card",
        ),
        style: {
          left: "52px",
        },
      };
    }

    return {
      className: "",
      style: {},
    };
  }

  const tabItems: Array<{
    id: ReviewWorkspaceTab;
    label: string;
    count?: number;
  }> = [
    { id: "pendentes", label: "Pendentes", count: counts.pendentes },
    { id: "mantidas", label: "Mantidas", count: counts.mantidas },
    { id: "excluidas", label: "Excluidas", count: counts.excluidas },
    { id: "consolidado", label: "Consolidado" },
    { id: "logs", label: "Logs" },
  ];

  return (
    <>
      <ReviewLogsDrawer
        auditLogs={auditLogs}
        open={logsOpen}
        onOpenChange={setLogsOpen}
      />

      <div className="space-y-6">
        <div className="sticky top-4 z-30 space-y-4">
          <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur">
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Revisao premium
                  </p>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                      Alta produtividade para decidir entrada por entrada
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {apuracaoName}
                      {clientName ? ` • ${clientName}` : ""}. Use a pagina por lotes,
                      com filtros persistidos, atalhos e auditoria lateral para
                      revisar milhares de linhas sem inflar a tela.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    render={<Link href={appRouteBuilders.apuracaoUpload(apuracaoId)} />}
                  >
                    <Files className="size-4" />
                    PDFs
                  </Button>
                  <Button variant="outline" onClick={() => setLogsOpen(true)}>
                    <History className="size-4" />
                    Logs
                  </Button>
                  <Button
                    render={<Link href={appRouteBuilders.apuracaoExcel(apuracaoId)} />}
                  >
                    <FileSpreadsheet className="size-4" />
                    Excel
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Total estruturado</p>
                  <p className="mt-2 text-3xl font-semibold">{counts.total}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="mt-2 text-3xl font-semibold text-muted-foreground">
                    {counts.pendentes}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Mantidas</p>
                  <p className="mt-2 text-3xl font-semibold text-primary">
                    {counts.mantidas}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Excluidas</p>
                  <p className="mt-2 text-3xl font-semibold text-destructive">
                    {counts.excluidas}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">Pagina atual</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {pagination?.page ?? 1}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => openTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/70 bg-card/90 text-foreground hover:border-primary/40",
                )}
              >
                {tab.label}
                {typeof tab.count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      activeTab === tab.id
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "consolidado" ? (
          consolidated ? (
            <ReviewConsolidatedTab
              monthlySummaries={consolidated.monthlySummaries}
              kpis={consolidated.kpis}
              snapshotReferenceKey={consolidated.latestSnapshotReferenceKey}
            />
          ) : (
            <Card className="border-border/70 bg-card/90">
              <CardContent className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
                Nenhum consolidado disponivel ainda. Aprove as entradas na revisao
                para preencher esta aba.
              </CardContent>
            </Card>
          )
        ) : activeTab === "logs" ? (
          <Card className="border-border/70 bg-card/90">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <Rows3 className="size-8 text-primary" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Auditoria em drawer lateral
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Os logs ficam fora da grade principal para preservar foco operacional.
                  Abra o drawer lateral para acompanhar as acoes recentes sem esticar
                  a tela inteira.
                </p>
              </div>
              <Button onClick={() => setLogsOpen(true)}>
                <History className="size-4" />
                Abrir logs agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <Card className="border-border/70 bg-card/90">
                <CardContent className="p-0">
                  <div
                    ref={scrollRef}
                    className="h-[72vh] overflow-auto rounded-3xl"
                  >
                    <div className="min-w-[1600px]">
                      <div className="sticky top-0 z-20 border-b border-border/70 bg-card/95 backdrop-blur">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <div
                            key={headerGroup.id}
                            className="grid items-center gap-3 px-3 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                            style={{ gridTemplateColumns }}
                          >
                            {headerGroup.headers.map((header) => {
                              const pinned = getPinnedStyles(header.column.id, true);

                              return (
                                <button
                                  key={header.id}
                                  type="button"
                                  className={cn(
                                    "flex items-center gap-2 px-2 text-left",
                                    header.column.getCanSort()
                                      ? "cursor-pointer"
                                      : "cursor-default",
                                    pinned.className,
                                  )}
                                  style={pinned.style}
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
                              );
                            })}
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
                            const isFocused = focusedTransactionId === row.original.id;

                            return (
                              <div
                                key={row.id}
                                className={cn(
                                  "absolute left-0 top-0 w-full px-3",
                                  row.getIsSelected() ? "bg-muted/30" : "",
                                )}
                                style={{
                                  height: `${virtualRow.size}px`,
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                              >
                                <div
                                  className={cn(
                                    "grid min-h-[76px] items-center gap-3 border-b border-border/70 py-3 text-sm transition-colors hover:bg-muted/10",
                                    isFocused ? "rounded-2xl ring-1 ring-ring/40" : "",
                                  )}
                                  style={{ gridTemplateColumns }}
                                  onClick={() => setFocusedTransactionId(row.original.id)}
                                >
                                  {row.getVisibleCells().map((cell) => {
                                    const pinned = getPinnedStyles(cell.column.id);

                                    return (
                                      <div
                                        key={cell.id}
                                        className={cn("min-w-0 px-2", pinned.className)}
                                        style={pinned.style}
                                      >
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext(),
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex min-h-[360px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                          Nenhuma transacao encontrada para os filtros atuais.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/90 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    Somente status manter entra no consolidado.
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CircleSlash className="size-4 text-destructive" />
                    Exclusoes mantem auditoria completa.
                  </span>
                </div>
                <span>
                  {selectedTransactionIds.length} selecionadas • {transactions.length} nesta
                  pagina
                </span>
              </div>

              {pagination ? (
                <div className="flex items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card/90 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Pagina {pagination.page} de {pagination.totalPages} •{" "}
                    {pagination.totalItems} registros
                  </p>
                  <div className="flex items-center gap-2">
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
            </div>

            <ReviewSidebar
              query={query}
              onQueryChange={setQuery}
              month={month}
              onMonthChange={setMonth}
              year={year}
              onYearChange={setYear}
              direction={direction}
              onDirectionChange={setDirection}
              duplicate={duplicate}
              onDuplicateChange={setDuplicate}
              monthOptions={filterOptions.months}
              yearOptions={filterOptions.years}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
              selectedCount={selectedTransactionIds.length}
              filteredCount={transactions.length}
              pageCount={rows.length}
              batchDecision={batchDecision}
              onBatchDecisionChange={setBatchDecision}
              batchReason={batchReason}
              onBatchReasonChange={setBatchReason}
              batchNote={batchNote}
              onBatchNoteChange={setBatchNote}
              onApplyBatch={handleBatchApply}
              isApplyingBatch={isApplyingBatch}
              onUndo={handleUndo}
              canUndo={Boolean(lastAction)}
              isUndoing={isUndoing}
              onOpenLogs={() => setLogsOpen(true)}
            />
          </div>
        )}
      </div>
    </>
  );
}

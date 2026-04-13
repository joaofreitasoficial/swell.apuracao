"use client";

import {
  type SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  CircleSlash,
  Clock3,
  LoaderCircle,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { ReviewDecisionBadge } from "@/components/reviews/review-decision-badge";
import {
  exclusionReasonOptions,
  getExclusionReasonLabel,
  getMonthYearLabel,
  getTransactionDirectionLabel,
} from "@/components/reviews/review-labels";
import { ReviewToolbar } from "@/components/reviews/review-toolbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  ExclusionReason,
  ReviewDecision,
  ReviewableTransactionRecord,
  TransactionDirection,
  TransactionReviewRecord,
} from "@/types/domain";

const columnHelper = createColumnHelper<ReviewableTransactionRecord>();
const gridTemplateColumns =
  "48px 110px 88px 88px 168px 168px minmax(320px,2.2fr) 150px 170px 190px 240px";
const rowHeight = 88;
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

type ReviewTableProps = {
  apuracaoId: string;
  initialTransactions: ReviewableTransactionRecord[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
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

function getSortIcon(direction: false | "asc" | "desc") {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5" />;
  }

  return <ArrowUpDown className="size-3.5" />;
}

function isEditableElement(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function ReviewTable({
  apuracaoId,
  initialTransactions,
}: ReviewTableProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([
    { id: "transactionDate", desc: true },
  ]);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | ReviewDecision>("all");
  const [monthFilter, setMonthFilter] = useState<"all" | number>("all");
  const [yearFilter, setYearFilter] = useState<"all" | number>("all");
  const [directionFilter, setDirectionFilter] = useState<
    "all" | TransactionDirection
  >("all");
  const [duplicateFilter, setDuplicateFilter] = useState<"all" | "only" | "hide">(
    "all",
  );
  const [batchDecision, setBatchDecision] = useState<ReviewDecision>("manter");
  const [batchReason, setBatchReason] = useState<"" | ExclusionReason>("");
  const [batchNote, setBatchNote] = useState("");
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [focusedTransactionId, setFocusedTransactionId] = useState<string | null>(null);
  const [isApplyingBatch, startBatchTransition] = useTransition();
  const [isUndoing, startUndoTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const monthOptions = Array.from(
    new Set(transactions.map((transaction) => transaction.monthRef)),
  ).sort((a, b) => a - b);
  const yearOptions = Array.from(
    new Set(transactions.map((transaction) => transaction.yearRef)),
  ).sort((a, b) => a - b);

  const filteredTransactions = transactions.filter((transaction) => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const decision = transaction.review?.decision ?? "pendente";
    const amountText = formatCurrency(transaction.amount).toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      transaction.description.toLowerCase().includes(normalizedQuery) ||
      transaction.bankName.toLowerCase().includes(normalizedQuery) ||
      (transaction.accountLabel ?? "").toLowerCase().includes(normalizedQuery) ||
      amountText.includes(normalizedQuery);

    const matchesDecision =
      decisionFilter === "all" || decision === decisionFilter;
    const matchesMonth =
      monthFilter === "all" || transaction.monthRef === monthFilter;
    const matchesYear = yearFilter === "all" || transaction.yearRef === yearFilter;
    const matchesDirection =
      directionFilter === "all" || transaction.direction === directionFilter;
    const matchesDuplicate =
      duplicateFilter === "all" ||
      (duplicateFilter === "only" && transaction.isDuplicate) ||
      (duplicateFilter === "hide" && !transaction.isDuplicate);

    return (
      matchesQuery &&
      matchesDecision &&
      matchesMonth &&
      matchesYear &&
      matchesDirection &&
      matchesDuplicate
    );
  });

  const selectedTransactionIds = Object.entries(rowSelection)
    .filter(([, selected]) => Boolean(selected))
    .map(([transactionId]) => transactionId);

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

  function setSaving(transactionIds: string[], isSaving: boolean) {
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
  }

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

  function findTransaction(transactionId: string) {
    return transactions.find((transaction) => transaction.id === transactionId) ?? null;
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

  function clearFilters() {
    setQuery("");
    setDecisionFilter("all");
    setMonthFilter("all");
    setYearFilter("all");
    setDirectionFilter("all");
    setDuplicateFilter("all");
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
            aria-label="Selecionar linhas filtradas"
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
      cell: ({ row }) => formatDate(row.original.transactionDate),
    }),
    columnHelper.accessor("monthRef", {
      id: "monthRef",
      header: "Mes",
      cell: ({ row }) => String(row.original.monthRef).padStart(2, "0"),
    }),
    columnHelper.accessor("yearRef", {
      id: "yearRef",
      header: "Ano",
      cell: ({ row }) => row.original.yearRef,
    }),
    columnHelper.accessor("bankName", {
      id: "bankName",
      header: "Banco",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="truncate font-medium">{row.original.bankName}</p>
          <p className="text-xs text-muted-foreground">
            {getTransactionDirectionLabel(row.original.direction)}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("accountLabel", {
      id: "accountLabel",
      header: "Conta",
      cell: ({ row }) => row.original.accountLabel ?? "Nao identificado",
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
    columnHelper.accessor("amount", {
      id: "amount",
      header: "Valor",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium">{formatCurrency(row.original.amount)}</p>
          <p className="text-xs text-muted-foreground">
            {getMonthYearLabel(row.original.monthRef, row.original.yearRef)}
          </p>
        </div>
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
                : "Disponivel apenas quando a linha for excluida."}
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
            placeholder="Anote contexto ou justificativa"
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
    data: filteredTransactions,
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
    overscan: 8,
  });

  const manterCount = transactions.filter(
    (transaction) => (transaction.review?.decision ?? "pendente") === "manter",
  ).length;
  const excluirCount = transactions.filter(
    (transaction) => (transaction.review?.decision ?? "pendente") === "excluir",
  ).length;
  const pendenteCount = transactions.length - manterCount - excluirCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total estruturado</p>
          <p className="mt-2 text-3xl font-semibold">{transactions.length}</p>
        </div>
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Mantidas</p>
          <p className="mt-2 text-3xl font-semibold text-primary">{manterCount}</p>
        </div>
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Excluidas</p>
          <p className="mt-2 text-3xl font-semibold text-destructive">
            {excluirCount}
          </p>
        </div>
        <div className="rounded-3xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="mt-2 text-3xl font-semibold text-muted-foreground">
            {pendenteCount}
          </p>
        </div>
      </div>

      <ReviewToolbar
        totalCount={transactions.length}
        filteredCount={filteredTransactions.length}
        selectedCount={selectedTransactionIds.length}
        query={query}
        onQueryChange={setQuery}
        decisionFilter={decisionFilter}
        onDecisionFilterChange={setDecisionFilter}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
        directionFilter={directionFilter}
        onDirectionFilterChange={setDirectionFilter}
        duplicateFilter={duplicateFilter}
        onDuplicateFilterChange={setDuplicateFilter}
        monthOptions={monthOptions}
        yearOptions={yearOptions}
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
        onClearFilters={clearFilters}
      />

      <div className="rounded-3xl border bg-card">
        <div ref={scrollRef} className="h-[68vh] overflow-auto">
          <div className="min-w-[1800px]">
            <div className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
              {table.getHeaderGroups().map((headerGroup) => (
                <div
                  key={headerGroup.id}
                  className="grid items-center gap-3 px-3 py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                  style={{ gridTemplateColumns }}
                >
                  {headerGroup.headers.map((header) => (
                    <button
                      key={header.id}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 text-left",
                        header.column.getCanSort() ? "cursor-pointer" : "cursor-default",
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
                  const isFocused = focusedTransactionId === row.original.id;

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "absolute left-0 top-0 w-full px-3",
                        row.getIsSelected() ? "bg-muted/40" : "",
                      )}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div
                        className={cn(
                          "grid min-h-[76px] items-center gap-3 border-b py-3 text-sm transition-colors hover:bg-muted/20",
                          isFocused ? "rounded-2xl ring-1 ring-ring/50" : "",
                        )}
                        style={{ gridTemplateColumns }}
                        onClick={() => setFocusedTransactionId(row.original.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div key={cell.id} className="min-w-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock3 className="size-5" />
                  Nenhuma transacao corresponde aos filtros atuais.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Somente status manter entra no consolidado final.
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleSlash className="size-4 text-destructive" />
              Exclusoes mantem auditoria de reviewed_at, motivo e observacao.
            </span>
          </div>
          <span>
            {selectedTransactionIds.length} selecionadas, {filteredTransactions.length}{" "}
            visiveis.
          </span>
        </div>
      </div>
    </div>
  );
}

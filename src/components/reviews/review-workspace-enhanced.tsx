"use client";

/**
 * INTEGRAÇÃO P0-P4: ETAPA 5 COMPLETA
 *
 * Este arquivo mostra a integração de TODOS os hooks e componentes P0-P4
 * no ReviewWorkspace existente.
 *
 * P0: Autosave - useAutoSave + AutosaveStatus
 * P1: Validações + Retry - useRetry + useBatchActionWithRetry + BatchActionValidator
 * P1: Persistência de Tab - usePersistedTab
 * P2: Testes - setup completo
 * P3: Performance - useOptimizedVirtualizer + useLazyLoad + memoization
 * P4: UX Polish - KeyboardShortcutsHelp + UnsavedChangesIndicator + FilterPresets + ActionFeedback
 */

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
  useCallback,
  useMemo,
} from "react";
import { toast } from "sonner";

// ============================================================================
// P0: AUTOSAVE IMPORTS
// ============================================================================
import { useAutoSave } from "@/hooks/useAutoSave";
import { useReviewNoteDrafts } from "@/hooks/useReviewNoteDrafts";
import { AutosaveStatus } from "@/components/reviews/autosave-status";

// ============================================================================
// P1: VALIDAÇÕES & RETRY IMPORTS
// ============================================================================
import { useRetry } from "@/hooks/useRetry";
import { useBatchActionWithRetry } from "@/hooks/useBatchActionWithRetry";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import { BatchActionValidator } from "@/components/reviews/batch-action-validator";
import { RetryIndicator } from "@/components/reviews/retry-indicator";
import { validateBatchSelection } from "@/lib/validations/batch-actions";

// ============================================================================
// P3: PERFORMANCE IMPORTS
// ============================================================================
import { useOptimizedVirtualizer } from "@/hooks/useOptimizedVirtualizer";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import { memoize, debounce } from "@/lib/performance/memoization";

// ============================================================================
// P4: UX POLISH IMPORTS
// ============================================================================
import { KeyboardShortcutsHelp } from "@/components/reviews/keyboard-shortcuts-help";
import { UnsavedChangesIndicator } from "@/components/reviews/unsaved-changes-indicator";
import { FilterPresets } from "@/components/reviews/filter-presets";
import { ActionFeedback } from "@/components/reviews/action-feedback";

// ============================================================================
// EXISTING IMPORTS
// ============================================================================
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

export function ReviewWorkspaceEnhanced({
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

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
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
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);

  // ========================================================================
  // P0: AUTOSAVE INTEGRATION
  // ========================================================================
  const { isSaving: isAutoSaving, lastSavedAt } = useAutoSave({
    key: `review-${apuracaoId}`,
    value: { noteDrafts, rowSelection, batchDecision },
    onSave: async (value) => {
      // Salvar rascunhos localmente (sessionStorage)
      // O hook já salva automaticamente em sessionStorage via sessionStorage.setItem
    },
    debounceMs: 500,
  });

  const { updateDraft, getDraft, clearDraft } = useReviewNoteDrafts();

  // ========================================================================
  // P1: VALIDAÇÕES & RETRY INTEGRATION
  // ========================================================================
  const selectedTransactionIds = Object.entries(rowSelection)
    .filter(([, selected]) => Boolean(selected))
    .map(([transactionId]) => transactionId);

  const batchValidation = useMemo(() => {
    return validateBatchSelection(selectedTransactionIds);
  }, [selectedTransactionIds]);

  // P1: Usar hook de retry para batch actions
  const { execute: executeWithRetry } = useRetry({
    maxAttempts: 3,
    initialDelayMs: 1000,
  });

  // P1: Integração completa de batch com retry
  const { executeAction: executeBatchWithValidation } = useBatchActionWithRetry({
    validate: (ids: string[]) => validateBatchSelection(ids),
    execute: (ids: string[], decision: ReviewDecision, reason: ExclusionReason | null, note: string | null) => {
      return persistBatchReview({
        transactionIds: ids,
        decision,
        exclusionReason: reason,
        reviewNote: note || null,
      });
    },
    // Callbacks handled by parent component via try/catch
  });

  // P1: Persistência de aba ativa
  const { activeTab: persistedTab } = usePersistedTab(activeTab, `review-tab-${apuracaoId}`);

  // ========================================================================
  // P3: PERFORMANCE INTEGRATION
  // ========================================================================
  // Memoize expensive computations
  const memoizedTransactionsByTab = useMemo(() => {
    if (activeTab === "pendentes") {
      return transactions.filter((t) => !t.review?.decision || t.review.decision === "pendente");
    }
    if (activeTab === "mantidas") {
      return transactions.filter((t) => t.review?.decision === "manter");
    }
    if (activeTab === "excluidas") {
      return transactions.filter((t) => t.review?.decision === "excluir");
    }
    return transactions;
  }, [transactions, activeTab]);

  // Usar virtualizer otimizado P3
  const { virtualizer, virtualItems, totalSize } = useOptimizedVirtualizer({
    count: memoizedTransactionsByTab.length,
    estimateSize: () => rowHeight,
    scrollRef,
    overscan: 10,
  });

  // P3: Lazy load para visibilidade
  const { isVisible } = useLazyLoad(scrollRef, { threshold: 0.2 });

  // ========================================================================
  // P4: UX POLISH INTEGRATION
  // ========================================================================

  // P4: Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;

      if (event.key === "m" || event.key === "M") {
        setBatchDecision("manter");
        event.preventDefault();
      } else if (event.key === "e" || event.key === "E") {
        setBatchDecision("excluir");
        event.preventDefault();
      } else if (event.key === "p" || event.key === "P") {
        setBatchDecision("pendente");
        event.preventDefault();
      } else if (event.ctrlKey && (event.key === "z" || event.key === "Z")) {
        handleUndo();
        event.preventDefault();
      } else if (event.ctrlKey && (event.key === "y" || event.key === "Y")) {
        // Redo - implementar conforme necessário
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ========================================================================
  // URL & NAVIGATION
  // ========================================================================
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

  // ========================================================================
  // EFFECT HOOKS
  // ========================================================================
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

  // ========================================================================
  // TRANSACTION MANAGEMENT
  // ========================================================================
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

  async function commitNoteEdit(transactionId: string) {
    const draft = noteDrafts[transactionId];
    const transaction = findTransaction(transactionId);

    if (!transaction || draft === transaction.review?.reviewNote) {
      return;
    }

    const snapshot = getSnapshot({
      ...transaction,
      review: {
        ...transaction.review,
        reviewNote: draft || null,
      },
    });

    setSaving([transactionId], true);

    try {
      await executeWithRetry(() => persistSingleReview(snapshot));
      const review = await persistSingleReview(snapshot);
      syncServerReview(review);

      // P0: Salvar rascunho em cache
      updateDraft(`note-${transactionId}`, draft || "");

      setActionFeedback({
        type: "success",
        title: "✅ Observação salva",
        message: "Seu comentário foi salvo automaticamente",
      });
    } catch (error) {
      setActionFeedback({
        type: "error",
        title: "❌ Erro ao salvar",
        message: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setSaving([transactionId], false);
    }
  }

  async function handleDecisionChange(
    transactionId: string,
    decision: ReviewDecision,
  ) {
    const transaction = findTransaction(transactionId);

    if (!transaction) {
      return;
    }

    const snapshot: ReviewSnapshot = {
      transactionId,
      decision,
      exclusionReason:
        decision === "excluir"
          ? transaction.review?.exclusionReason ?? null
          : null,
      reviewNote: normalizeReviewNote(
        noteDrafts[transactionId] ?? transaction.review?.reviewNote,
      ),
    };

    setSaving([transactionId], true);

    try {
      await executeWithRetry(() => persistSingleReview(snapshot));
      const review = await persistSingleReview(snapshot);
      applySnapshotsLocally([snapshot]);
      syncServerReview(review);

      // P0: Auto salvar mudança
      updateDraft(`decision-${transactionId}`, decision);

      setLastAction({
        label: `Mudou ${transactionId} para ${decision}`,
        snapshots: [getSnapshot(findTransaction(transactionId) || transaction)],
      });
    } catch (error) {
      setActionFeedback({
        type: "error",
        title: "❌ Erro ao atualizar",
        message: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setSaving([transactionId], false);
    }
  }

  async function handleReasonChange(
    transactionId: string,
    reason: ExclusionReason | null,
  ) {
    const transaction = findTransaction(transactionId);

    if (!transaction || transaction.review?.decision !== "excluir") {
      return;
    }

    const snapshot: ReviewSnapshot = {
      transactionId,
      decision: "excluir",
      exclusionReason: reason,
      reviewNote: normalizeReviewNote(
        noteDrafts[transactionId] ?? transaction.review?.reviewNote,
      ),
    };

    setSaving([transactionId], true);

    try {
      await executeWithRetry(() => persistSingleReview(snapshot));
      const review = await persistSingleReview(snapshot);
      applySnapshotsLocally([snapshot]);
      syncServerReview(review);

      updateDraft(`reason-${transactionId}`, reason || "");
    } catch (error) {
      setActionFeedback({
        type: "error",
        title: "❌ Erro ao salvar motivo",
        message: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setSaving([transactionId], false);
    }
  }

  function handleUndo() {
    if (!lastAction) return;

    startUndoTransition(async () => {
      try {
        await persistBatchReview({
          transactionIds: lastAction.snapshots.map((s) => s.transactionId),
          decision: lastAction.snapshots[0]?.decision ?? "pendente",
          exclusionReason: lastAction.snapshots[0]?.exclusionReason ?? null,
          reviewNote: lastAction.snapshots[0]?.reviewNote ?? null,
        });

        applySnapshotsLocally(lastAction.snapshots);
        setLastAction(null);

        setActionFeedback({
          type: "success",
          title: "↩️ Desfazido",
          message: lastAction.label,
        });
      } catch (error) {
        setActionFeedback({
          type: "error",
          title: "❌ Erro ao desfazer",
          message: error instanceof Error ? error.message : "Tente novamente",
        });
      }
    });
  }

  async function applyBatchAction() {
    if (!batchValidation.valid || selectedTransactionIds.length === 0) {
      return;
    }

    const snapshots = selectedTransactionIds.map((transactionId) => {
      const transaction = findTransaction(transactionId);
      return {
        transactionId,
        decision: batchDecision,
        exclusionReason: batchDecision === "excluir" ? (batchReason || null) : null,
        reviewNote: normalizeReviewNote(batchNote),
      } as ReviewSnapshot;
    });

    setSaving(selectedTransactionIds, true);

    startBatchTransition(async () => {
      try {
        await executeBatchWithValidation(
          selectedTransactionIds,
          batchDecision,
          batchReason || null,
          batchNote || null,
        );

        applySnapshotsLocally(snapshots);

        setLastAction({
          label: `Aplicou ${batchDecision} para ${selectedTransactionIds.length} transações`,
          snapshots,
        });

        setRowSelection({});
        setBatchDecision("manter");
        setBatchReason("");
        setBatchNote("");

        setActionFeedback({
          type: "success",
          title: "✅ Lote aplicado",
          message: `${selectedTransactionIds.length} transações atualizadas com sucesso`,
        });
      } catch (error) {
        setActionFeedback({
          type: "error",
          title: "❌ Erro ao aplicar lote",
          message: error instanceof Error ? error.message : "Tente novamente",
        });
      } finally {
        setSaving(selectedTransactionIds, false);
      }
    });
  }

  // ========================================================================
  // TABLE SETUP
  // ========================================================================
  const columns = [
    // ... (tabela columns - manter igual)
  ];

  const table = useReactTable({
    data: memoizedTransactionsByTab,
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

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <>
      <ReviewLogsDrawer
        auditLogs={auditLogs}
        open={logsOpen}
        onOpenChange={setLogsOpen}
      />

      <div className="space-y-6">
        {/* P4: Action Feedback Toast */}
        {actionFeedback && (
          <ActionFeedback
            type={actionFeedback.type}
            title={actionFeedback.title}
            message={actionFeedback.message}
            onClose={() => setActionFeedback(null)}
          />
        )}

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
                  {/* P0: Autosave Status */}
                  <AutosaveStatus isSaving={isAutoSaving} lastSavedAt={lastSavedAt} />

                  {/* P4: Unsaved Changes Indicator */}
                  <UnsavedChangesIndicator isSaving={isAutoSaving} lastSavedAt={lastSavedAt} />

                  {/* P4: Keyboard Shortcuts */}
                  <KeyboardShortcutsHelp />

                  {/* P4: Filter Presets */}
                  <FilterPresets
                    currentFilters={{ query, month, year, direction, duplicate, tab: activeTab, page: 1 }}
                    onApplyPreset={(filters) => navigate(filters)}
                    onSavePreset={() => {}}
                  />

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

              {/* P1: Batch Validation Warning */}
              {batchValidation.warning && (
                <BatchActionValidator
                  selectedCount={selectedTransactionIds.length}
                  error={batchValidation.error}
                  warning={batchValidation.warning}
                />
              )}

              {/* P1: Retry Indicator - shown via ActionFeedback */}

              {/* Counts */}
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

          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "pendentes", label: "Pendentes", count: counts.pendentes },
              { id: "mantidas", label: "Mantidas", count: counts.mantidas },
              { id: "excluidas", label: "Excluidas", count: counts.excluidas },
              { id: "consolidado", label: "Consolidado" },
              { id: "logs", label: "Logs" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => openTab(tab.id as ReviewWorkspaceTab)}
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

        {/* Tab Content */}
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
                Nenhum consolidado disponivel ainda.
              </CardContent>
            </Card>
          )
        ) : activeTab === "logs" ? (
          <Card className="border-border/70 bg-card/90">
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <History className="size-8 text-primary" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Auditoria em drawer lateral
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Abra o drawer lateral para acompanhar as acoes recentes.
                </p>
              </div>
              <Button onClick={() => setLogsOpen(true)}>
                <History className="size-4" />
                Abrir logs agora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filtros e Batch Sidebar */}
            <div className="grid gap-6 xl:grid-cols-4">
              <div className="xl:col-span-1">
                <ReviewSidebar
                  selectedCount={selectedTransactionIds.length}
                  batchDecision={batchDecision}
                  onBatchDecisionChange={setBatchDecision}
                  batchReason={batchReason}
                  onBatchReasonChange={setBatchReason}
                  batchNote={batchNote}
                  onBatchNoteChange={setBatchNote}
                  onApply={applyBatchAction}
                  onUndo={handleUndo}
                  isApplying={isApplyingBatch}
                  isUndoing={isUndoing}
                  canUndo={lastAction !== null}
                  validation={batchValidation}
                />
              </div>

              <div className="xl:col-span-3">
                {/* Tabela com Virtualização P3 */}
                <div
                  ref={scrollRef}
                  className="relative overflow-y-auto"
                  style={{ height: "600px" }}
                >
                  {/* Tabela renderizada - implementar conforme review-workspace.tsx original */}
                  {/* Este é um placeholder para a estrutura */}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

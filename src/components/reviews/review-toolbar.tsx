"use client";

import { Filter, RefreshCcw, Undo2 } from "lucide-react";

import { exclusionReasonOptions, reviewDecisionOptions } from "@/components/reviews/review-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExclusionReason,
  ReviewDecision,
  TransactionDirection,
} from "@/types/domain";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ReviewToolbarProps = {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  decisionFilter: "all" | ReviewDecision;
  onDecisionFilterChange: (value: "all" | ReviewDecision) => void;
  monthFilter: "all" | number;
  onMonthFilterChange: (value: "all" | number) => void;
  yearFilter: "all" | number;
  onYearFilterChange: (value: "all" | number) => void;
  directionFilter: "all" | TransactionDirection;
  onDirectionFilterChange: (value: "all" | TransactionDirection) => void;
  duplicateFilter: "all" | "only" | "hide";
  onDuplicateFilterChange: (value: "all" | "only" | "hide") => void;
  monthOptions: number[];
  yearOptions: number[];
  batchDecision: ReviewDecision;
  onBatchDecisionChange: (value: ReviewDecision) => void;
  batchReason: "" | ExclusionReason;
  onBatchReasonChange: (value: "" | ExclusionReason) => void;
  batchNote: string;
  onBatchNoteChange: (value: string) => void;
  onApplyBatch: () => void;
  isApplyingBatch: boolean;
  onUndo: () => void;
  canUndo: boolean;
  isUndoing: boolean;
  onClearFilters: () => void;
};

export function ReviewToolbar({
  totalCount,
  filteredCount,
  selectedCount,
  query,
  onQueryChange,
  decisionFilter,
  onDecisionFilterChange,
  monthFilter,
  onMonthFilterChange,
  yearFilter,
  onYearFilterChange,
  directionFilter,
  onDirectionFilterChange,
  duplicateFilter,
  onDuplicateFilterChange,
  monthOptions,
  yearOptions,
  batchDecision,
  onBatchDecisionChange,
  batchReason,
  onBatchReasonChange,
  batchNote,
  onBatchNoteChange,
  onApplyBatch,
  isApplyingBatch,
  onUndo,
  canUndo,
  isUndoing,
  onClearFilters,
}: ReviewToolbarProps) {
  return (
    <div className="space-y-4 rounded-3xl border bg-card p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Revisao operacional</h3>
          <p className="text-sm text-muted-foreground">
            {filteredCount} de {totalCount} transacoes visiveis. Selecionadas:{" "}
            {selectedCount}. Atalhos: M manter, E excluir, P pendente, Ctrl/Cmd+Z
            desfaz.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClearFilters}>
            <RefreshCcw className="size-4" />
            Limpar filtros
          </Button>
          <Button variant="outline" onClick={onUndo} disabled={!canUndo || isUndoing}>
            <Undo2 className="size-4" />
            {isUndoing ? "Desfazendo..." : "Desfazer ultima acao"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2.2fr_repeat(5,minmax(0,1fr))]">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por descricao, banco, conta ou valor"
        />

        <select
          className={selectClassName}
          value={decisionFilter}
          onChange={(event) =>
            onDecisionFilterChange(event.target.value as "all" | ReviewDecision)
          }
        >
          <option value="all">Todos os status</option>
          {reviewDecisionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className={selectClassName}
          value={String(monthFilter)}
          onChange={(event) =>
            onMonthFilterChange(
              event.target.value === "all" ? "all" : Number(event.target.value),
            )
          }
        >
          <option value="all">Todos os meses</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              Mes {String(month).padStart(2, "0")}
            </option>
          ))}
        </select>

        <select
          className={selectClassName}
          value={String(yearFilter)}
          onChange={(event) =>
            onYearFilterChange(
              event.target.value === "all" ? "all" : Number(event.target.value),
            )
          }
        >
          <option value="all">Todos os anos</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          className={selectClassName}
          value={directionFilter}
          onChange={(event) =>
            onDirectionFilterChange(
              event.target.value as "all" | TransactionDirection,
            )
          }
        >
          <option value="all">Credito e debito</option>
          <option value="credit">Somente credito</option>
          <option value="debit">Somente debito</option>
        </select>

        <select
          className={selectClassName}
          value={duplicateFilter}
          onChange={(event) =>
            onDuplicateFilterChange(
              event.target.value as "all" | "only" | "hide",
            )
          }
        >
          <option value="all">Duplicadas e unicas</option>
          <option value="only">Somente duplicadas</option>
          <option value="hide">Ocultar duplicadas</option>
        </select>
      </div>

      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4" />
          Acao em lote para as linhas selecionadas
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_2fr_auto] xl:items-start">
          <select
            className={selectClassName}
            value={batchDecision}
            onChange={(event) =>
              onBatchDecisionChange(event.target.value as ReviewDecision)
            }
          >
            {reviewDecisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className={selectClassName}
            value={batchReason}
            disabled={batchDecision !== "excluir"}
            onChange={(event) =>
              onBatchReasonChange(event.target.value as "" | ExclusionReason)
            }
          >
            <option value="">Sem motivo</option>
            {exclusionReasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Textarea
            className="min-h-8 resize-none"
            placeholder="Observacao opcional para aplicar em lote"
            value={batchNote}
            onChange={(event) => onBatchNoteChange(event.target.value)}
          />

          <Button
            className="xl:self-end"
            onClick={onApplyBatch}
            disabled={selectedCount === 0 || isApplyingBatch}
          >
            {isApplyingBatch ? "Aplicando..." : `Aplicar em ${selectedCount}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

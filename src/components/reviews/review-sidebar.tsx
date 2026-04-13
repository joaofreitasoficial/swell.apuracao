"use client";

import { Filter, Layers3, Sparkles, Undo2 } from "lucide-react";

import { exclusionReasonOptions } from "@/components/reviews/review-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExclusionReason,
  ReviewDecision,
  ReviewWorkspaceDuplicateFilter,
} from "@/types/domain";

const selectClassName =
  "h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ReviewSidebarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  month: number | null;
  onMonthChange: (value: number | null) => void;
  year: number | null;
  onYearChange: (value: number | null) => void;
  direction: "all" | "credit" | "debit";
  onDirectionChange: (value: "all" | "credit" | "debit") => void;
  duplicate: ReviewWorkspaceDuplicateFilter;
  onDuplicateChange: (value: ReviewWorkspaceDuplicateFilter) => void;
  monthOptions: number[];
  yearOptions: number[];
  onApplyFilters: () => void;
  onClearFilters: () => void;
  selectedCount: number;
  filteredCount: number;
  pageCount: number;
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
  onOpenLogs: () => void;
};

export function ReviewSidebar({
  query,
  onQueryChange,
  month,
  onMonthChange,
  year,
  onYearChange,
  direction,
  onDirectionChange,
  duplicate,
  onDuplicateChange,
  monthOptions,
  yearOptions,
  onApplyFilters,
  onClearFilters,
  selectedCount,
  filteredCount,
  pageCount,
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
  onOpenLogs,
}: ReviewSidebarProps) {
  return (
    <div className="sticky top-36 space-y-4">
      <Card className="border-border/70 bg-card/90 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
            <Filter className="size-4 text-primary" />
            Filtros e pagina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por descricao, banco ou conta"
            />

            <select
              className={selectClassName}
              value={month ?? "all"}
              onChange={(event) =>
                onMonthChange(
                  event.target.value === "all" ? null : Number(event.target.value),
                )
              }
            >
              <option value="all">Todos os meses</option>
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  Mes {String(option).padStart(2, "0")}
                </option>
              ))}
            </select>

            <select
              className={selectClassName}
              value={year ?? "all"}
              onChange={(event) =>
                onYearChange(
                  event.target.value === "all" ? null : Number(event.target.value),
                )
              }
            >
              <option value="all">Todos os anos</option>
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              className={selectClassName}
              value={direction}
              onChange={(event) =>
                onDirectionChange(event.target.value as "all" | "credit" | "debit")
              }
            >
              <option value="all">Credito e debito</option>
              <option value="credit">Somente credito</option>
              <option value="debit">Somente debito</option>
            </select>

            <select
              className={selectClassName}
              value={duplicate}
              onChange={(event) =>
                onDuplicateChange(
                  event.target.value as ReviewWorkspaceDuplicateFilter,
                )
              }
            >
              <option value="all">Duplicadas e unicas</option>
              <option value="only">Somente duplicadas</option>
              <option value="hide">Ocultar duplicadas</option>
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button onClick={onApplyFilters}>Aplicar filtros</Button>
            <Button variant="outline" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
            <p>{filteredCount} linhas nesta pagina</p>
            <p>{pageCount} linhas carregadas no grid atual</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
            <Layers3 className="size-4 text-primary" />
            Acoes em lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 text-sm">
            <p className="font-medium">{selectedCount} linhas selecionadas</p>
            <p className="mt-1 text-muted-foreground">
              Atalhos: M manter, E excluir, P pendente, Ctrl/Cmd+Z para desfazer.
            </p>
          </div>

          <select
            className={selectClassName}
            value={batchDecision}
            onChange={(event) =>
              onBatchDecisionChange(event.target.value as ReviewDecision)
            }
          >
            <option value="manter">Manter</option>
            <option value="excluir">Excluir</option>
            <option value="pendente">Pendente</option>
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
            className="min-h-24 resize-none"
            placeholder="Observacao opcional para aplicar em lote"
            value={batchNote}
            onChange={(event) => onBatchNoteChange(event.target.value)}
          />

          <div className="grid gap-2">
            <Button
              onClick={onApplyBatch}
              disabled={selectedCount === 0 || isApplyingBatch}
            >
              {isApplyingBatch ? "Aplicando..." : `Aplicar em ${selectedCount}`}
            </Button>
            <Button
              variant="outline"
              onClick={onUndo}
              disabled={!canUndo || isUndoing}
            >
              <Undo2 className="size-4" />
              {isUndoing ? "Desfazendo..." : "Desfazer ultima acao"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
            <Sparkles className="size-4 text-primary" />
            Operacao premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use a aba certa para atacar o lote por contexto: pendentes para decisao,
            mantidas para conferência final e excluidas para auditoria.
          </p>
          <Button variant="outline" className="w-full" onClick={onOpenLogs}>
            Abrir logs laterais
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

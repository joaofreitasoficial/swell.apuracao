import {
  BarChart3,
  CalendarRange,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { MonthlySummaryTable } from "@/components/summaries/monthly-summary-table";
import { ConsolidatedKpiCard } from "@/components/summaries/consolidated-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import type { ConsolidatedKpis, MonthlySummaryRecord } from "@/types/domain";

type ReviewConsolidatedTabProps = {
  monthlySummaries: MonthlySummaryRecord[];
  kpis: ConsolidatedKpis;
  snapshotReferenceKey: string | null;
};

export function ReviewConsolidatedTab({
  monthlySummaries,
  kpis,
  snapshotReferenceKey,
}: ReviewConsolidatedTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ConsolidatedKpiCard
          title="Total anual"
          value={formatCurrency(kpis.totalAnnual)}
          description="Soma aprovada na revisao"
          icon={Landmark}
        />
        <ConsolidatedKpiCard
          title="Media mensal"
          value={formatCurrency(kpis.averageMonthly)}
          description="Media dos meses consolidados"
          icon={BarChart3}
        />
        <ConsolidatedKpiCard
          title="Maior mes"
          value={
            kpis.highestMonth
              ? formatCurrency(kpis.highestMonth.totalIncluded)
              : formatCurrency(0)
          }
          description={
            kpis.highestMonth
              ? formatMonthYear(kpis.highestMonth.monthRef, kpis.highestMonth.yearRef)
              : "Sem dados"
          }
          icon={TrendingUp}
        />
        <ConsolidatedKpiCard
          title="Menor mes"
          value={
            kpis.lowestMonth
              ? formatCurrency(kpis.lowestMonth.totalIncluded)
              : formatCurrency(0)
          }
          description={
            kpis.lowestMonth
              ? formatMonthYear(kpis.lowestMonth.monthRef, kpis.lowestMonth.yearRef)
              : "Sem dados"
          }
          icon={TrendingDown}
        />
        <ConsolidatedKpiCard
          title="Entradas aprovadas"
          value={String(kpis.entriesCount)}
          description={`${kpis.monthsCount} meses consolidados`}
          icon={CalendarRange}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <MonthlySummaryTable summaries={monthlySummaries} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">
              Snapshot do consolidado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Referencia atual</p>
              <p className="break-all font-medium">
                {snapshotReferenceKey ?? "Sem snapshot recente"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Regra central</p>
              <p className="font-medium">
                Apenas transacoes marcadas como manter entram no consolidado.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Uso operacional</p>
              <p className="font-medium">
                Revise as pendentes, valide as excluidas e volte aqui para conferir
                o fechamento mensal antes do Excel final.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

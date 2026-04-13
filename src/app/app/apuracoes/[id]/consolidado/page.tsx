import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { ConsolidatedKpiCard } from "@/components/summaries/consolidated-kpi-card";
import { MonthlyEvolutionChart } from "@/components/summaries/monthly-evolution-chart";
import { MonthlySummaryTable } from "@/components/summaries/monthly-summary-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatCurrency, formatDateTime, formatMonthYear } from "@/lib/formatters";
import { getApuracaoById } from "@/lib/operations/queries";
import { refreshMonthlySummaries } from "@/lib/summaries/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoConsolidadoPage({ params }: PageProps) {
  const { id } = await params;
  const apuracao = await getApuracaoById(id);

  if (!apuracao) {
    notFound();
  }

  const consolidated = await refreshMonthlySummaries(id);

  if (consolidated.monthlySummaries.length === 0) {
    return (
      <EmptyState
        title="Ainda nao ha consolidado mensal"
        description="Aprove primeiro as entradas na revisao operacional. O consolidado usa apenas as linhas com status manter."
        ctaHref={appRouteBuilders.apuracaoReview(id)}
        ctaLabel="Abrir revisao operacional"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Consolidado mensal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Inteligencia financeira da apuracao
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Este painel resume o que foi mantido na revisao operacional e prepara a
          base para a geracao final do Excel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <ConsolidatedKpiCard
          title="Total anual"
          value={formatCurrency(consolidated.kpis.totalAnnual)}
          description="Soma de todos os meses aprovados"
          icon={Landmark}
        />
        <ConsolidatedKpiCard
          title="Media mensal"
          value={formatCurrency(consolidated.kpis.averageMonthly)}
          description="Media dos meses consolidados"
          icon={BarChart3}
        />
        <ConsolidatedKpiCard
          title="Maior mes"
          value={
            consolidated.kpis.highestMonth
              ? formatCurrency(consolidated.kpis.highestMonth.totalIncluded)
              : formatCurrency(0)
          }
          description={
            consolidated.kpis.highestMonth
              ? formatMonthYear(
                  consolidated.kpis.highestMonth.monthRef,
                  consolidated.kpis.highestMonth.yearRef,
                )
              : "Sem dados"
          }
          icon={TrendingUp}
        />
        <ConsolidatedKpiCard
          title="Menor mes"
          value={
            consolidated.kpis.lowestMonth
              ? formatCurrency(consolidated.kpis.lowestMonth.totalIncluded)
              : formatCurrency(0)
          }
          description={
            consolidated.kpis.lowestMonth
              ? formatMonthYear(
                  consolidated.kpis.lowestMonth.monthRef,
                  consolidated.kpis.lowestMonth.yearRef,
                )
              : "Sem dados"
          }
          icon={TrendingDown}
        />
        <ConsolidatedKpiCard
          title="Entradas aprovadas"
          value={String(consolidated.kpis.entriesCount)}
          description={`${consolidated.kpis.monthsCount} meses consolidados`}
          icon={CalendarRange}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <MonthlySummaryTable summaries={consolidated.monthlySummaries} />
          <MonthlyEvolutionChart summaries={consolidated.monthlySummaries} />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">
              Resumo do consolidado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Apuracao</p>
              <p className="font-medium">{apuracao.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{apuracao.clientFullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Snapshot atual</p>
              <p className="font-medium break-all">
                {consolidated.latestSnapshotReferenceKey}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Atualizada em</p>
              <p className="font-medium">{formatDateTime(apuracao.updatedAt)}</p>
            </div>
            <div className="space-y-2 pt-2">
              <Button
                className="w-full"
                render={<Link href={appRouteBuilders.apuracaoReview(apuracao.id)} />}
              >
                Voltar para revisao
              </Button>
              <Button
                className="w-full"
                variant="outline"
                render={<Link href={appRouteBuilders.apuracaoExcel(apuracao.id)} />}
              >
                Abrir exportacao Excel
              </Button>
              <Button
                className="w-full"
                variant="outline"
                render={<Link href={appRouteBuilders.apuracao(apuracao.id)} />}
              >
                Voltar para apuracao
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

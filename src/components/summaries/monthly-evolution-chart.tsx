import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import type { MonthlySummaryRecord } from "@/types/domain";

export function MonthlyEvolutionChart({
  summaries,
}: {
  summaries: MonthlySummaryRecord[];
}) {
  const maxValue = Math.max(...summaries.map((summary) => summary.totalIncluded), 0);

  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">Evolucao mensal</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Visual da oscilacao da renda aprovada ao longo dos meses.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {summaries.length > 0 ? (
          summaries.map((summary) => {
            const width =
              maxValue > 0 ? `${Math.max((summary.totalIncluded / maxValue) * 100, 4)}%` : "0%";

            return (
              <div key={summary.id} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">
                    {formatMonthYear(summary.monthRef, summary.yearRef)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(summary.totalIncluded)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-primary transition-[width]"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            O grafico aparece assim que houver meses consolidados.
          </p>
        )}
      </div>
    </div>
  );
}

import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import type { MonthlySummaryRecord } from "@/types/domain";

export function MonthlySummaryTable({
  summaries,
}: {
  summaries: MonthlySummaryRecord[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">Tabela resumo</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Consolidado por mes considerando apenas entradas marcadas como manter.
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-3">Mes</th>
              <th className="px-3 py-3">Ano</th>
              <th className="px-3 py-3">Entradas</th>
              <th className="px-3 py-3">Total aprovado</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length > 0 ? (
              summaries.map((summary) => (
                <tr key={summary.id} className="border-b last:border-b-0">
                  <td className="px-3 py-4 font-medium">
                    {formatMonthYear(summary.monthRef, summary.yearRef)}
                  </td>
                  <td className="px-3 py-4">{summary.yearRef}</td>
                  <td className="px-3 py-4">{summary.entriesCount}</td>
                  <td className="px-3 py-4 font-medium">
                    {formatCurrency(summary.totalIncluded)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma entrada aprovada ainda para gerar o consolidado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

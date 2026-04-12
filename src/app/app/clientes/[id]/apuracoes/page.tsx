import { notFound } from "next/navigation";

import { ApuracaoForm } from "@/components/operations/apuracao-form";
import { ApuracoesTable } from "@/components/operations/apuracoes-table";
import { FilterToolbar } from "@/components/operations/filter-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { appRouteBuilders } from "@/lib/constants/routes";
import { getApuracaoStatusLabel } from "@/lib/formatters";
import { getClientById, listApuracoesByClient } from "@/lib/operations/queries";
import { apuracaoStatuses } from "@/types/domain";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientApuracoesPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const [client, result] = await Promise.all([
    getClientById(id),
    listApuracoesByClient(id, resolvedSearchParams),
  ]);

  if (!client) {
    notFound();
  }

  const buildHref = (page: number) => {
    const paramsValue = new URLSearchParams();

    if (result.filters.query) {
      paramsValue.set("query", result.filters.query);
    }

    if (result.filters.status) {
      paramsValue.set("status", result.filters.status);
    }

    paramsValue.set("page", String(page));

    return `/app/clientes/${id}/apuracoes?${paramsValue.toString()}`;
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <ApuracaoForm mode="create" clientId={id} />

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Apurações de {client.fullName}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Crie novas apurações, aplique filtros por status e acompanhe o
            histórico deste cliente.
          </p>
        </div>

        <FilterToolbar
          searchPlaceholder="Buscar apuração por nome"
          defaultQuery={result.filters.query}
          defaultStatus={result.filters.status}
          statusOptions={apuracaoStatuses.map((status) => ({
            value: status,
            label: getApuracaoStatusLabel(status),
          }))}
        />

        {result.data.length > 0 ? (
          <ApuracoesTable data={result.data} />
        ) : (
          <EmptyState
            title="Nenhuma apuração encontrada"
            description="Crie a primeira apuração deste cliente ou ajuste os filtros aplicados."
            ctaHref={appRouteBuilders.client(id)}
            ctaLabel="Voltar ao cliente"
          />
        )}
        <PaginationControls pagination={result.pagination} buildHref={buildHref} />
      </div>
    </div>
  );
}

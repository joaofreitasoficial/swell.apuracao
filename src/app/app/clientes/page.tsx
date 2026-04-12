import Link from "next/link";

import { ClientsTable } from "@/components/operations/clients-table";
import { FilterToolbar } from "@/components/operations/filter-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/constants/routes";
import { listClients } from "@/lib/operations/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const result = await listClients(resolvedSearchParams);

  const buildHref = (page: number) => {
    const params = new URLSearchParams();

    if (result.filters.query) {
      params.set("query", result.filters.query);
    }

    params.set("page", String(page));

    return `${routes.clients}?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Busque, filtre e mantenha o cadastro da sua base operacional.
          </p>
        </div>
        <Button render={<Link href={routes.newClient} />}>Novo cliente</Button>
      </div>

      <FilterToolbar
        searchPlaceholder="Buscar por nome, WhatsApp ou CPF"
        defaultQuery={result.filters.query}
      />

      {result.data.length > 0 ? (
        <ClientsTable data={result.data} />
      ) : (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste os filtros atuais ou crie um novo cliente para começar o fluxo."
          ctaHref={routes.newClient}
          ctaLabel="Novo cliente"
        />
      )}
      <PaginationControls pagination={result.pagination} buildHref={buildHref} />
    </div>
  );
}

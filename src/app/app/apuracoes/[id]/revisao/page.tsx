import { notFound } from "next/navigation";

import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { EmptyState } from "@/components/shared/empty-state";
import { appRouteBuilders } from "@/lib/constants/routes";
import {
  getApuracaoById,
  getReviewWorkspaceCounts,
  getReviewWorkspaceFilterOptions,
  listAuditLogsByApuracao,
  listCreditsByMonthForApuracao,
  listPaginatedReviewTransactionsByApuracao,
  parseReviewWorkspaceFilters,
} from "@/lib/operations/queries";
import { refreshMonthlySummaries } from "@/lib/summaries/service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApuracaoReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filters = parseReviewWorkspaceFilters(resolvedSearchParams);

  const [apuracao, counts, filterOptions, auditLogs] = await Promise.all([
    getApuracaoById(id),
    getReviewWorkspaceCounts(id),
    getReviewWorkspaceFilterOptions(id),
    listAuditLogsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  if (counts.total === 0) {
    return (
      <EmptyState
        title="Ainda nao ha transacoes para revisar"
        description="Envie os PDFs da apuracao e aguarde o pipeline estruturar as movimentacoes. Assim que as linhas forem geradas, a revisao premium fica disponivel aqui."
        ctaHref={appRouteBuilders.apuracaoUpload(apuracao.id)}
        ctaLabel="Enviar extratos PDF"
      />
    );
  }

  const [reviewPage, consolidated, monthlyBuckets] = await Promise.all([
    listPaginatedReviewTransactionsByApuracao(id, filters),
    filters.tab === "consolidado" ? refreshMonthlySummaries(id) : Promise.resolve(null),
    filters.tab === "meses" ? listCreditsByMonthForApuracao(id) : Promise.resolve(null),
  ]);

  const hidesPagination =
    filters.tab === "consolidado" ||
    filters.tab === "logs" ||
    filters.tab === "meses";

  return (
    <ReviewWorkspace
      apuracaoId={apuracao.id}
      apuracaoName={apuracao.fullName}
      clientName={apuracao.clientFullName}
      activeTab={filters.tab}
      initialFilters={filters}
      counts={counts}
      filterOptions={filterOptions}
      initialTransactions={reviewPage.data}
      pagination={hidesPagination ? null : reviewPage.pagination}
      auditLogs={auditLogs}
      consolidated={consolidated}
      monthlyBuckets={monthlyBuckets}
    />
  );
}

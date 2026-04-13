import Link from "next/link";
import { notFound } from "next/navigation";

import { AuditLogPanel } from "@/components/reviews/audit-log-panel";
import { ReviewTable } from "@/components/reviews/review-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDateTime } from "@/lib/formatters";
import {
  getApuracaoById,
  listAuditLogsByApuracao,
  listReviewableTransactionsByApuracao,
} from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoReviewPage({ params }: PageProps) {
  const { id } = await params;
  const [apuracao, transactions, auditLogs] = await Promise.all([
    getApuracaoById(id),
    listReviewableTransactionsByApuracao(id),
    listAuditLogsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Ainda nao ha transacoes para revisar"
        description="Envie os PDFs da apuracao e aguarde o pipeline estruturar as movimentacoes. Assim que as linhas forem geradas, a revisao operacional fica disponivel aqui."
        ctaHref={appRouteBuilders.apuracaoUpload(apuracao.id)}
        ctaLabel="Enviar extratos PDF"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Revisao operacional
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Avalie entrada por entrada antes do consolidado
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              A IA apenas estruturou as movimentacoes. A decisao final do que
              permanece ou fica de fora continua manual, com auditoria e acao em
              lote.
            </p>
          </div>

          <ReviewTable
            apuracaoId={apuracao.id}
            initialTransactions={transactions}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">Resumo da revisao</CardTitle>
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
                <p className="text-muted-foreground">Linhas para revisar</p>
                <p className="font-medium">{transactions.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atualizada em</p>
                <p className="font-medium">{formatDateTime(apuracao.updatedAt)}</p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  render={
                    <Link href={appRouteBuilders.apuracaoConsolidado(apuracao.id)} />
                  }
                >
                  Abrir consolidado mensal
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  render={<Link href={appRouteBuilders.apuracao(apuracao.id)} />}
                >
                  Voltar para detalhes da apuracao
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  render={
                    <Link href={appRouteBuilders.apuracaoUpload(apuracao.id)} />
                  }
                >
                  Gerenciar arquivos PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <AuditLogPanel auditLogs={auditLogs} />
        </div>
      </div>
    </div>
  );
}

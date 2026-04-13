import Link from "next/link";
import { notFound } from "next/navigation";

import { ApuracaoForm } from "@/components/operations/apuracao-form";
import { DeleteApuracaoButton } from "@/components/operations/delete-apuracao-button";
import { StatusBadge } from "@/components/operations/status-badge";
import { TransactionsPreviewTable } from "@/components/operations/transactions-preview-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDateTime } from "@/lib/formatters";
import { getApuracaoById, listTransactionsByApuracao } from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [apuracao, transactions] = await Promise.all([
    getApuracaoById(id),
    listTransactionsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ApuracaoForm
          mode="edit"
          clientId={apuracao.clientId}
          initialValues={{
            id: apuracao.id,
            fullName: apuracao.fullName,
            status: apuracao.status,
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">
                Resumo da apuracao
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{apuracao.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{apuracao.clientFullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <StatusBadge status={apuracao.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Arquivos</p>
                <p className="font-medium">{apuracao.statementFilesCount ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transacoes extraidas</p>
                <p className="font-medium">{apuracao.transactionsCount ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium">{formatDateTime(apuracao.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atualizada em</p>
                <p className="font-medium">{formatDateTime(apuracao.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 rounded-3xl border bg-card p-6">
            <h3 className="text-xl font-semibold tracking-tight">Proximos passos</h3>
            <Button
              className="w-full"
              render={<Link href={appRouteBuilders.apuracaoUpload(apuracao.id)} />}
            >
              Enviar extratos PDF
            </Button>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href={appRouteBuilders.apuracaoArquivos(apuracao.id)} />}
            >
              Ver arquivos e logs
            </Button>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href={appRouteBuilders.apuracaoReview(apuracao.id)} />}
            >
              Abrir revisao operacional
            </Button>
            <Button
              className="w-full"
              variant="outline"
              render={
                <Link href={appRouteBuilders.apuracaoConsolidado(apuracao.id)} />
              }
            >
              Ver consolidado mensal
            </Button>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href={appRouteBuilders.apuracaoExcel(apuracao.id)} />}
            >
              Gerar Excel final
            </Button>
            <Button
              className="w-full"
              variant="outline"
              render={
                <Link href={appRouteBuilders.clientApuracoes(apuracao.clientId)} />
              }
            >
              Voltar para lista de apuracoes
            </Button>
            <DeleteApuracaoButton
              apuracaoId={apuracao.id}
              apuracaoName={apuracao.fullName}
              clientId={apuracao.clientId}
            />
          </div>
        </div>
      </div>

      <TransactionsPreviewTable transactions={transactions} />
    </div>
  );
}

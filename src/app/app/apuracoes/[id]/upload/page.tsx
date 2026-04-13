import Link from "next/link";
import { notFound } from "next/navigation";

import { TransactionsPreviewTable } from "@/components/operations/transactions-preview-table";
import { ProcessingLogsList } from "@/components/uploads/processing-logs-list";
import { ReprocessingJobsList } from "@/components/uploads/reprocessing-jobs-list";
import { StatementFilesManager } from "@/components/uploads/statement-files-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDateTime } from "@/lib/formatters";
import {
  getApuracaoById,
  listFileProcessingLogs,
  listReprocessingJobsByApuracao,
  listStatementFiles,
  listTransactionsByApuracao,
} from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoUploadPage({ params }: PageProps) {
  const { id } = await params;
  const [apuracao, files, logs, jobs, transactions] = await Promise.all([
    getApuracaoById(id),
    listStatementFiles(id),
    listFileProcessingLogs(id),
    listReprocessingJobsByApuracao(id),
    listTransactionsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <StatementFilesManager apuracaoId={apuracao.id} files={files} />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-xl tracking-tight">
              Resumo da etapa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Apuração</p>
              <p className="font-medium">{apuracao.fullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{apuracao.clientFullName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Extratos registrados</p>
              <p className="font-medium">{files.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última atualização</p>
              <p className="font-medium">{formatDateTime(apuracao.updatedAt)}</p>
            </div>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href={appRouteBuilders.apuracao(apuracao.id)} />}
            >
              Voltar para apuração
            </Button>
          </CardContent>
        </Card>
      </div>

      <TransactionsPreviewTable transactions={transactions} />
      <ReprocessingJobsList jobs={jobs} />
      <ProcessingLogsList logs={logs} />
    </div>
  );
}

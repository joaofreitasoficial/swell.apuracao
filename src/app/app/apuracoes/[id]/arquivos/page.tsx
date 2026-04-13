import Link from "next/link";
import { notFound } from "next/navigation";

import { StatementFilesHistory } from "@/components/uploads/statement-files-history";
import { Button } from "@/components/ui/button";
import { appRouteBuilders } from "@/lib/constants/routes";
import {
  getApuracaoById,
  listFileProcessingLogs,
  listReprocessingJobsByApuracao,
  listStatementFiles,
} from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoFilesPage({ params }: PageProps) {
  const { id } = await params;
  const [apuracao, files, logs, jobs] = await Promise.all([
    getApuracaoById(id),
    listStatementFiles(id),
    listFileProcessingLogs(id),
    listReprocessingJobsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Arquivos e logs da apuracao
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apuracao.fullName} • {apuracao.clientFullName}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            render={<Link href={appRouteBuilders.apuracaoUpload(apuracao.id)} />}
          >
            Voltar para upload
          </Button>
          <Button
            variant="outline"
            render={<Link href={appRouteBuilders.apuracao(apuracao.id)} />}
          >
            Voltar para apuracao
          </Button>
        </div>
      </div>

      <StatementFilesHistory
        apuracaoId={apuracao.id}
        files={files}
        jobs={jobs}
        logs={logs}
      />
    </div>
  );
}

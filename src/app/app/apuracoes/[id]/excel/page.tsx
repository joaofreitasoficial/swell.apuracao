import Link from "next/link";
import { notFound } from "next/navigation";

import { GenerateExcelCard } from "@/components/excel/generate-excel-card";
import { GeneratedExcelsTable } from "@/components/excel/generated-excels-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDateTime } from "@/lib/formatters";
import {
  getApuracaoById,
  listGeneratedExcelsByApuracao,
} from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApuracaoExcelPage({ params }: PageProps) {
  const { id } = await params;
  const [apuracao, generatedExcels] = await Promise.all([
    getApuracaoById(id),
    listGeneratedExcelsByApuracao(id),
  ]);

  if (!apuracao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Exportacao Excel
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Gerar arquivo final da apuracao
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          O sistema usa o consolidado revisado e aplica os valores no layout do
          modelo oficial configurado para a plataforma.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {generatedExcels.length > 0 ? (
            <GeneratedExcelsTable generatedExcels={generatedExcels} />
          ) : (
            <EmptyState
              title="Nenhum Excel gerado ainda"
              description="Assim que voce gerar o primeiro arquivo, ele aparecera aqui com historico e download."
            />
          )}
        </div>

        <div className="space-y-6">
          <GenerateExcelCard
            apuracaoId={apuracao.id}
            generatedCount={generatedExcels.length}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">
                Contexto da exportacao
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
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{apuracao.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atualizada em</p>
                <p className="font-medium">{formatDateTime(apuracao.updatedAt)}</p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  variant="outline"
                  render={
                    <Link href={appRouteBuilders.apuracaoConsolidado(apuracao.id)} />
                  }
                >
                  Voltar ao consolidado
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
    </div>
  );
}

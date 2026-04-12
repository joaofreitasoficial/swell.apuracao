import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  FolderClock,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";

import { ApuracoesTable } from "@/components/operations/apuracoes-table";
import { ClientsTable } from "@/components/operations/clients-table";
import { KpiCard } from "@/components/operations/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { appRouteBuilders, routes } from "@/lib/constants/routes";
import { getDashboardFeed, getDashboardKpis } from "@/lib/operations/queries";

export default async function AppPage() {
  const [kpis, feed] = await Promise.all([getDashboardKpis(), getDashboardFeed()]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Clientes"
          value={kpis.totalClients}
          description="Base total de clientes cadastrados."
          icon={Users}
        />
        <KpiCard
          title="Apurações"
          value={kpis.totalApuracoes}
          description="Total de apurações em andamento ou concluídas."
          icon={WalletCards}
        />
        <KpiCard
          title="Em revisão"
          value={kpis.reviewingApuracoes}
          description="Fluxos aguardando sua análise operacional."
          icon={Workflow}
        />
        <KpiCard
          title="Rascunhos"
          value={kpis.draftApuracoes}
          description="Apurações abertas e ainda não iniciadas."
          icon={FolderClock}
        />
        <KpiCard
          title="Arquivos enviados"
          value={kpis.filesUploadedApuracoes}
          description="Prontas para a etapa de upload e processamento."
          icon={FileText}
        />
        <KpiCard
          title="Finalizadas"
          value={kpis.finalizedApuracoes}
          description="Apurações já fechadas na operação."
          icon={FileSpreadsheet}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-3xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Clientes recentes
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Acompanhe os cadastros mais novos e continue o fluxo com poucos
                cliques.
              </p>
            </div>
            <Button variant="outline" render={<Link href={routes.clients} />}>
              Ver todos
            </Button>
          </div>
          {feed.recentClients.length > 0 ? (
            <ClientsTable data={feed.recentClients} />
          ) : (
            <EmptyState
              title="Nenhum cliente cadastrado"
              description="Crie o primeiro cliente para começar a operação."
              ctaHref={routes.newClient}
              ctaLabel="Cadastrar cliente"
            />
          )}
        </div>

        <div className="space-y-4 rounded-3xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                Apurações recentes
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Veja rapidamente o que está em revisão, rascunho ou finalizado.
              </p>
            </div>
            <Button
              variant="outline"
              render={
                <Link
                  href={
                    feed.recentClients[0]
                      ? appRouteBuilders.clientApuracoes(feed.recentClients[0].id)
                      : routes.clients
                  }
                />
              }
            >
              Abrir fluxo
            </Button>
          </div>
          {feed.recentApuracoes.length > 0 ? (
            <ApuracoesTable data={feed.recentApuracoes} showClientColumn />
          ) : (
            <EmptyState
              title="Nenhuma apuração criada"
              description="As apurações vão aparecer aqui assim que você abrir o fluxo de um cliente."
              ctaHref={routes.clients}
              ctaLabel="Ir para clientes"
            />
          )}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/operations/client-form";
import { DeleteClientButton } from "@/components/operations/delete-client-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { appRouteBuilders } from "@/lib/constants/routes";
import { formatDateTime } from "@/lib/formatters";
import { getClientById } from "@/lib/operations/queries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ClientForm
          mode="edit"
          initialValues={{
            id: client.id,
            fullName: client.fullName,
            whatsapp: client.whatsapp,
            cpf: client.cpf,
            notes: client.notes,
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{client.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{client.whatsapp}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium">{formatDateTime(client.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Atualizado em</p>
                <p className="font-medium">{formatDateTime(client.updatedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Apurações</p>
                <p className="font-medium">{client.apuracoesCount ?? 0}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 rounded-3xl border bg-card p-6">
            <h3 className="text-xl font-semibold tracking-tight">
              Ações rápidas
            </h3>
            <Button
              className="w-full"
              render={<Link href={appRouteBuilders.clientApuracoes(client.id)} />}
            >
              Gerenciar apurações
            </Button>
            <DeleteClientButton clientId={client.id} clientName={client.fullName} />
          </div>
        </div>
      </div>

      {client.apuracoesCount ? null : (
        <EmptyState
          title="Nenhuma apuração criada para este cliente"
          description="Abra a primeira apuração para seguir para upload e revisão nas próximas etapas."
          ctaHref={appRouteBuilders.clientApuracoes(client.id)}
          ctaLabel="Criar primeira apuração"
        />
      )}
    </div>
  );
}

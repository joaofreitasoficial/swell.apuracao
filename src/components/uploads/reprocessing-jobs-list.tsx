import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/formatters";
import type {
  ReprocessingDiffItem,
  ReprocessingJobRecord,
  ReprocessingJobStatus,
  ReprocessingJobTrigger,
} from "@/types/domain";

function getTriggerLabel(triggerType: ReprocessingJobTrigger) {
  switch (triggerType) {
    case "upload":
      return "Upload novo";
    case "retry":
      return "Retry";
    case "reupload":
      return "Reupload";
    default:
      return triggerType;
  }
}

function getStatusLabel(status: ReprocessingJobStatus) {
  switch (status) {
    case "processing":
      return "Processando";
    case "completed":
      return "Concluido";
    case "failed":
      return "Falhou";
    default:
      return status;
  }
}

function getStatusVariant(status: ReprocessingJobStatus) {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "processing":
      return "secondary";
    default:
      return "outline";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function DiffItemsList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: ReprocessingDiffItem[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h4>
        <Badge variant="outline">{items.length}</Badge>
      </div>

      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={`${title}-${item.transactionHash}-${item.transactionDate}-${item.amount}`}
              className="rounded-xl border border-border/70 bg-card p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{formatDate(item.transactionDate)}</span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export function ReprocessingJobsList({
  jobs,
}: {
  jobs: ReprocessingJobRecord[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">
          Reprocessamento incremental
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada novo upload ou reupload processa apenas o arquivo envolvido,
          preserva revisoes compatveis e registra o diff do que mudou.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-3xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getTriggerLabel(job.triggerType)}</Badge>
                    <Badge variant={getStatusVariant(job.status)}>
                      {getStatusLabel(job.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Iniciado em {formatDateTime(job.startedAt)}
                    {job.finishedAt ? ` • Finalizado em ${formatDateTime(job.finishedAt)}` : ""}
                  </p>
                  {job.errorMessage ? (
                    <p className="text-sm text-destructive">{job.errorMessage}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Inseridas
                    </p>
                    <p className="mt-1 text-xl font-semibold">{job.insertedCount}</p>
                  </div>
                  <div className="rounded-2xl border bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Removidas
                    </p>
                    <p className="mt-1 text-xl font-semibold">{job.removedCount}</p>
                  </div>
                  <div className="rounded-2xl border bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Reviews preservadas
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {job.preservedReviewCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Novas pendentes
                    </p>
                    <p className="mt-1 text-xl font-semibold">{job.pendingCount}</p>
                  </div>
                  <div className="rounded-2xl border bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Duplicadas
                    </p>
                    <p className="mt-1 text-xl font-semibold">{job.duplicateCount}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <DiffItemsList
                  title="Entradas novas"
                  items={job.diffSummary?.added ?? []}
                  emptyMessage="Nenhuma entrada nova neste job."
                />
                <DiffItemsList
                  title="Linhas removidas"
                  items={job.diffSummary?.removed ?? []}
                  emptyMessage="Nenhuma linha removida neste job."
                />
                <DiffItemsList
                  title="Reviews reaproveitadas"
                  items={job.diffSummary?.reviewPreserved ?? []}
                  emptyMessage="Nenhuma review precisou ser reaproveitada."
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Os jobs incrementais vao aparecer aqui depois do primeiro processamento.
          </p>
        )}
      </div>
    </div>
  );
}

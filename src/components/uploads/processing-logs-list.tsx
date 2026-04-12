import { formatDateTime } from "@/lib/formatters";
import type { FileProcessingLogRecord } from "@/types/domain";

export function ProcessingLogsList({
  logs,
}: {
  logs: FileProcessingLogRecord[];
}) {
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold tracking-tight">
          Logs de processamento
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Últimos eventos do pipeline de leitura e extração dos PDFs.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{log.stage}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {log.status}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {log.message}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Os logs vão aparecer aqui depois do primeiro upload.
          </p>
        )}
      </div>
    </div>
  );
}

import { ReviewDecisionBadge } from "@/components/reviews/review-decision-badge";
import { getExclusionReasonLabel } from "@/components/reviews/review-labels";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLogRecord, ExclusionReason, ReviewDecision } from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractAfterPayload(payload: Record<string, unknown> | null) {
  if (!payload || !isRecord(payload.after)) {
    return null;
  }

  return payload.after;
}

function getActionLabel(action: string) {
  switch (action) {
    case "review.created":
      return "Revisao criada";
    case "review.updated":
      return "Revisao atualizada";
    default:
      return action;
  }
}

export function AuditLogPanel({ auditLogs }: { auditLogs: AuditLogRecord[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">Auditoria recente</CardTitle>
        <CardDescription>
          Historico das decisoes aplicadas nas transacoes desta apuracao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {auditLogs.length > 0 ? (
          auditLogs.map((log) => {
            const payload = extractAfterPayload(log.payload);
            const decision = payload?.decision;
            const exclusionReason = payload?.exclusion_reason;

            return (
              <div
                key={log.id}
                className="rounded-2xl border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                  {typeof decision === "string" ? (
                    <ReviewDecisionBadge decision={decision as ReviewDecision} />
                  ) : null}
                </div>
                {typeof exclusionReason === "string" ? (
                  <p className="mt-2 text-muted-foreground">
                    Motivo:{" "}
                    {getExclusionReasonLabel(exclusionReason as ExclusionReason)}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </p>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum registro de auditoria ainda. As acoes da revisao comecam a
            aparecer aqui conforme voce avalia as entradas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

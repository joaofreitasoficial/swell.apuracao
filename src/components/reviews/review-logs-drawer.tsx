"use client";

import { History } from "lucide-react";

import { ReviewDecisionBadge } from "@/components/reviews/review-decision-badge";
import { getExclusionReasonLabel } from "@/components/reviews/review-labels";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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

type ReviewLogsDrawerProps = {
  auditLogs: AuditLogRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewLogsDrawer({
  auditLogs,
  open,
  onOpenChange,
}: ReviewLogsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-border/70 bg-card sm:max-w-[480px]"
      >
        <SheetHeader className="border-b border-border/70">
          <SheetTitle className="flex items-center gap-2 text-xl tracking-tight">
            <History className="size-4 text-primary" />
            Logs da revisao
          </SheetTitle>
          <SheetDescription>
            Auditoria recente das decisoes aplicadas nesta apuracao.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const payload = extractAfterPayload(log.payload);
                const decision = payload?.decision;
                const exclusionReason = payload?.exclusion_reason;

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                      {typeof decision === "string" ? (
                        <ReviewDecisionBadge decision={decision as ReviewDecision} />
                      ) : null}
                    </div>

                    {typeof exclusionReason === "string" ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Motivo:{" "}
                        {getExclusionReasonLabel(exclusionReason as ExclusionReason)}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum log de auditoria ainda. As alteracoes da revisao vao aparecer
              aqui conforme voce decide cada entrada.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

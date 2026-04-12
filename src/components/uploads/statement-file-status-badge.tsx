import { Badge } from "@/components/ui/badge";
import type { StatementFileStatus } from "@/types/domain";

const labels: Record<StatementFileStatus, string> = {
  uploaded: "Enviado",
  processing: "Processando",
  processed: "Processado",
  failed: "Falhou",
};

const variants: Record<
  StatementFileStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  uploaded: "secondary",
  processing: "default",
  processed: "default",
  failed: "destructive",
};

export function StatementFileStatusBadge({
  status,
}: {
  status: StatementFileStatus;
}) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

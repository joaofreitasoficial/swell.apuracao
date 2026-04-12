import { Badge } from "@/components/ui/badge";
import { getApuracaoStatusLabel } from "@/lib/formatters";
import type { ApuracaoStatus } from "@/types/domain";

const statusVariantMap: Record<
  ApuracaoStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  draft: "outline",
  files_uploaded: "secondary",
  processing: "secondary",
  reviewing: "default",
  finalized: "default",
  excel_generated: "default",
  archived: "outline",
};

export function StatusBadge({ status }: { status: ApuracaoStatus }) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {getApuracaoStatusLabel(status)}
    </Badge>
  );
}

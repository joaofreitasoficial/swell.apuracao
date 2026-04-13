import { Badge } from "@/components/ui/badge";
import { getReviewDecisionLabel } from "@/components/reviews/review-labels";
import type { ReviewDecision } from "@/types/domain";

const variantMap: Record<
  ReviewDecision,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  manter: "default",
  excluir: "destructive",
  pendente: "secondary",
};

export function ReviewDecisionBadge({
  decision,
}: {
  decision: ReviewDecision;
}) {
  return (
    <Badge variant={variantMap[decision]}>{getReviewDecisionLabel(decision)}</Badge>
  );
}

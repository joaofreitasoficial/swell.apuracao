import type {
  ExclusionReason,
  ReviewDecision,
  TransactionDirection,
} from "@/types/domain";

export const reviewDecisionOptions: Array<{
  value: ReviewDecision;
  label: string;
}> = [
  { value: "manter", label: "Manter" },
  { value: "excluir", label: "Excluir" },
  { value: "pendente", label: "Pendente" },
];

export const exclusionReasonOptions: Array<{
  value: ExclusionReason;
  label: string;
}> = [
  { value: "transferencia_propria", label: "Transferencia propria" },
  { value: "emprestimo", label: "Emprestimo" },
  { value: "estorno", label: "Estorno" },
  { value: "valor_eventual", label: "Valor eventual" },
  { value: "sem_comprovacao", label: "Sem comprovacao" },
  { value: "outro", label: "Outro" },
];

export function getReviewDecisionLabel(decision: ReviewDecision) {
  return (
    reviewDecisionOptions.find((option) => option.value === decision)?.label ??
    decision
  );
}

export function getExclusionReasonLabel(reason: ExclusionReason | null) {
  if (!reason) {
    return "Sem motivo";
  }

  return (
    exclusionReasonOptions.find((option) => option.value === reason)?.label ??
    reason
  );
}

export function getTransactionDirectionLabel(direction: TransactionDirection) {
  return direction === "credit" ? "Credito" : "Debito";
}

export function getMonthYearLabel(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

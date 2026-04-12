import type { ApuracaoStatus } from "@/types/domain";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

export function getApuracaoStatusLabel(status: ApuracaoStatus) {
  const labels: Record<ApuracaoStatus, string> = {
    draft: "Rascunho",
    files_uploaded: "Arquivos enviados",
    processing: "Processando",
    reviewing: "Em revisão",
    finalized: "Finalizada",
    excel_generated: "Excel gerado",
    archived: "Arquivada",
  };

  return labels[status];
}

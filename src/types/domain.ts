export const apuracaoStatuses = [
  "draft",
  "files_uploaded",
  "processing",
  "reviewing",
  "finalized",
  "excel_generated",
  "archived",
] as const;

export type ApuracaoStatus = (typeof apuracaoStatuses)[number];

export type ClientRecord = {
  id: string;
  userId: string;
  fullName: string;
  whatsapp: string;
  cpf: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  apuracoesCount?: number;
  latestApuracaoAt?: string | null;
};

export type ApuracaoRecord = {
  id: string;
  clientId: string;
  userId: string;
  fullName: string;
  status: ApuracaoStatus;
  createdAt: string;
  updatedAt: string;
  clientFullName?: string;
  statementFilesCount?: number;
  transactionsCount?: number;
};

export type RawExtractionRecord = {
  id: string;
  statementFileId: string;
  extractorKind: string;
  modelName: string | null;
  sourceText: string;
  rawOutput: unknown;
  normalizedOutput: unknown;
  success: boolean;
  createdAt: string;
};

export const statementFileStatuses = [
  "uploaded",
  "processing",
  "processed",
  "failed",
] as const;

export type StatementFileStatus = (typeof statementFileStatuses)[number];

export type StatementFileRecord = {
  id: string;
  apuracaoId: string;
  userId: string;
  fileName: string;
  originalFileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  processingStatus: StatementFileStatus;
  detectedBankName: string | null;
  detectedAccountLabel: string | null;
  pageCount: number | null;
  extractedText: string | null;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FileProcessingLogRecord = {
  id: string;
  statementFileId: string;
  stage: string;
  status: "info" | "success" | "error";
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type TransactionDirection = "credit" | "debit";

export type TransactionRecord = {
  id: string;
  apuracaoId: string;
  statementFileId: string;
  bankName: string;
  accountLabel: string | null;
  transactionDate: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  monthRef: number;
  yearRef: number;
  extractionConfidence: number;
  originalText: string;
  transactionHash: string;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
};

export const reviewDecisions = ["manter", "excluir", "pendente"] as const;

export type ReviewDecision = (typeof reviewDecisions)[number];

export const exclusionReasons = [
  "transferencia_propria",
  "emprestimo",
  "estorno",
  "valor_eventual",
  "sem_comprovacao",
  "outro",
] as const;

export type ExclusionReason = (typeof exclusionReasons)[number];

export type TransactionReviewRecord = {
  id: string;
  transactionId: string;
  decision: ReviewDecision;
  exclusionReason: ExclusionReason | null;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewableTransactionRecord = TransactionRecord & {
  review: TransactionReviewRecord | null;
};

export type AuditLogRecord = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  apuracaoId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type DashboardKpis = {
  totalClients: number;
  totalApuracoes: number;
  reviewingApuracoes: number;
  finalizedApuracoes: number;
  draftApuracoes: number;
  filesUploadedApuracoes: number;
};

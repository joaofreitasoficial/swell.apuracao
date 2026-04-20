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

export type ReprocessingDiffItem = {
  transactionHash: string;
  transactionDate: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
};

export type ReprocessingDiffSummary = {
  added: ReprocessingDiffItem[];
  removed: ReprocessingDiffItem[];
  reviewPreserved: ReprocessingDiffItem[];
};

export type ReprocessingJobTrigger = "upload" | "retry" | "reupload";

export type ReprocessingJobStatus = "processing" | "completed" | "failed";

export type ReprocessingJobRecord = {
  id: string;
  apuracaoId: string;
  statementFileId: string;
  triggerType: ReprocessingJobTrigger;
  status: ReprocessingJobStatus;
  insertedCount: number;
  removedCount: number;
  preservedReviewCount: number;
  pendingCount: number;
  duplicateCount: number;
  diffSummary: ReprocessingDiffSummary | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionVersionKind = "previous" | "current";

export type TransactionVersionRecord = {
  id: string;
  reprocessingJobId: string;
  apuracaoId: string;
  statementFileId: string;
  transactionId: string | null;
  transactionHash: string;
  versionKind: TransactionVersionKind;
  reviewWasPreserved: boolean;
  snapshot: Record<string, unknown>;
  createdAt: string;
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

export type MonthlySummaryRecord = {
  id: string;
  apuracaoId: string;
  monthRef: number;
  yearRef: number;
  totalIncluded: number;
  entriesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SummarySnapshotRecord = {
  id: string;
  apuracaoId: string;
  referenceKey: string;
  totals: Record<string, unknown>;
  createdAt: string;
};

export type ConsolidatedKpis = {
  totalAnnual: number;
  averageMonthly: number;
  highestMonth: MonthlySummaryRecord | null;
  lowestMonth: MonthlySummaryRecord | null;
  entriesCount: number;
  monthsCount: number;
};

export type ExcelTemplateMappingConfig = {
  worksheetName: string;
  dataStartRow: number;
  monthColumn: string;
  yearColumn: string;
  totalColumn: string;
  entriesColumn: string;
  clientNameCell?: string | null;
  apuracaoNameCell?: string | null;
  generatedAtCell?: string | null;
  totalAnnualCell?: string | null;
  averageMonthlyCell?: string | null;
  highestMonthCell?: string | null;
  lowestMonthCell?: string | null;
};

export type ExcelTemplateRecord = {
  id: string;
  uploadedBy: string | null;
  fileName: string;
  originalFileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  versionNumber: number;
  isActive: boolean;
  mappingConfig: ExcelTemplateMappingConfig;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedExcelRecord = {
  id: string;
  apuracaoId: string;
  templateId: string | null;
  generatedBy: string | null;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  templateVersion: number | null;
  createdAt: string;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export const reviewWorkspaceTabs = [
  "pendentes",
  "mantidas",
  "excluidas",
  "meses",
  "consolidado",
  "logs",
] as const;

export type ReviewWorkspaceTab = (typeof reviewWorkspaceTabs)[number];

export type ReviewWorkspaceDuplicateFilter = "all" | "only" | "hide";

export type ReviewWorkspaceFilters = {
  tab: ReviewWorkspaceTab;
  query: string;
  page: number;
  month: number | null;
  year: number | null;
  direction: "all" | TransactionDirection;
  duplicate: ReviewWorkspaceDuplicateFilter;
};

export type ReviewWorkspaceCounts = {
  total: number;
  pendentes: number;
  mantidas: number;
  excluidas: number;
};

export type ReviewWorkspaceFilterOptions = {
  months: number[];
  years: number[];
};

export type DashboardKpis = {
  totalClients: number;
  totalApuracoes: number;
  reviewingApuracoes: number;
  finalizedApuracoes: number;
  draftApuracoes: number;
  filesUploadedApuracoes: number;
};

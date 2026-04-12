import "server-only";

import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ApuracaoRecord,
  ApuracaoStatus,
  AuditLogRecord,
  ClientRecord,
  DashboardKpis,
  ExclusionReason,
  FileProcessingLogRecord,
  PaginationMeta,
  ReviewDecision,
  ReviewableTransactionRecord,
  StatementFileRecord,
  TransactionDirection,
  TransactionRecord,
  TransactionReviewRecord,
} from "@/types/domain";

const PAGE_SIZE = 10;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildPaginationMeta(page: number, totalItems: number): PaginationMeta {
  return {
    page,
    pageSize: PAGE_SIZE,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / PAGE_SIZE)),
  };
}

type ClientRow = {
  id: string;
  user_id: string;
  full_name: string;
  whatsapp: string;
  cpf: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  apuracoes: { id: string; created_at: string }[] | null;
};

type ApuracaoRow = {
  id: string;
  client_id: string;
  user_id: string;
  full_name: string;
  status: ApuracaoStatus;
  created_at: string;
  updated_at: string;
  clients: { full_name: string } | null;
  statement_files?: { id: string }[] | null;
  transactions?: { id: string }[] | null;
};

type StatementFileRow = {
  id: string;
  apuracao_id: string;
  user_id: string;
  file_name: string;
  original_file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  processing_status: StatementFileRecord["processingStatus"];
  detected_bank_name: string | null;
  detected_account_label: string | null;
  page_count: number | null;
  extracted_text: string | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
};

type FileProcessingLogRow = {
  id: string;
  statement_file_id: string;
  stage: string;
  status: "info" | "success" | "error";
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type TransactionReviewRow = {
  id: string;
  transaction_id: string;
  decision: ReviewDecision;
  exclusion_reason: ExclusionReason | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  apuracao_id: string;
  statement_file_id: string;
  bank_name: string;
  account_label: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  month_ref: number;
  year_ref: number;
  extraction_confidence: number;
  original_text: string;
  transaction_hash: string;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
  transaction_reviews: TransactionReviewRow | null;
};

type AuditLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_user_id: string | null;
  apuracao_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function mapClient(row: ClientRow): ClientRecord {
  const apuracoes = row.apuracoes ?? [];

  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    whatsapp: row.whatsapp,
    cpf: row.cpf,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    apuracoesCount: apuracoes.length,
    latestApuracaoAt:
      apuracoes.length > 0
        ? apuracoes
            .map((apuracao) => apuracao.created_at)
            .sort((a, b) => b.localeCompare(a))[0]
        : null,
  };
}

function mapApuracao(row: ApuracaoRow): ApuracaoRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    userId: row.user_id,
    fullName: row.full_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientFullName: row.clients?.full_name,
    statementFilesCount: row.statement_files?.length ?? 0,
    transactionsCount: row.transactions?.length ?? 0,
  };
}

function mapStatementFile(row: StatementFileRow): StatementFileRecord {
  return {
    id: row.id,
    apuracaoId: row.apuracao_id,
    userId: row.user_id,
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    processingStatus: row.processing_status,
    detectedBankName: row.detected_bank_name,
    detectedAccountLabel: row.detected_account_label,
    pageCount: row.page_count,
    extractedText: row.extracted_text,
    processingError: row.processing_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFileProcessingLog(row: FileProcessingLogRow): FileProcessingLogRecord {
  return {
    id: row.id,
    statementFileId: row.statement_file_id,
    stage: row.stage,
    status: row.status,
    message: row.message,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

function mapTransactionReview(
  row: TransactionReviewRow | null,
): TransactionReviewRecord | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    transactionId: row.transaction_id,
    decision: row.decision,
    exclusionReason: row.exclusion_reason,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    apuracaoId: row.apuracao_id,
    statementFileId: row.statement_file_id,
    bankName: row.bank_name,
    accountLabel: row.account_label,
    transactionDate: row.transaction_date,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    monthRef: row.month_ref,
    yearRef: row.year_ref,
    extractionConfidence: row.extraction_confidence,
    originalText: row.original_text,
    transactionHash: row.transaction_hash,
    isDuplicate: row.is_duplicate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReviewableTransaction(row: TransactionRow): ReviewableTransactionRecord {
  return {
    ...mapTransaction(row),
    review: mapTransactionReview(row.transaction_reviews),
  };
}

function mapAuditLog(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorUserId: row.actor_user_id,
    apuracaoId: row.apuracao_id,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export function parseClientListFilters(searchParams: SearchParamsInput) {
  return {
    query: getSingleParam(searchParams.query)?.trim() ?? "",
    page: Number(getSingleParam(searchParams.page) ?? "1") || 1,
  };
}

export function parseApuracaoListFilters(searchParams: SearchParamsInput) {
  return {
    query: getSingleParam(searchParams.query)?.trim() ?? "",
    status: getSingleParam(searchParams.status)?.trim() ?? "",
    page: Number(getSingleParam(searchParams.page) ?? "1") || 1,
  };
}

async function buildClientSearchCount(query: string) {
  const supabase = await createServerSupabaseClient();
  let countQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  if (query) {
    countQuery = countQuery.or(
      `full_name.ilike.%${query}%,whatsapp.ilike.%${query}%,cpf.ilike.%${query}%`,
    );
  }

  const { count, error } = await countQuery;

  if (error) {
    throw new Error(`Falha ao contar clientes: ${error.message}`);
  }

  return count ?? 0;
}

async function buildApuracaoSearchCount(params: {
  clientId?: string;
  query?: string;
  status?: string;
}) {
  const supabase = await createServerSupabaseClient();
  let countQuery = supabase
    .from("apuracoes")
    .select("id", { count: "exact", head: true });

  if (params.clientId) {
    countQuery = countQuery.eq("client_id", params.clientId);
  }

  if (params.query) {
    countQuery = countQuery.ilike("full_name", `%${params.query}%`);
  }

  if (params.status) {
    countQuery = countQuery.eq("status", params.status);
  }

  const { count, error } = await countQuery;

  if (error) {
    throw new Error(`Falha ao contar apurações: ${error.message}`);
  }

  return count ?? 0;
}

export async function listClients(searchParams: SearchParamsInput) {
  await requireRole("user");

  const filters = parseClientListFilters(searchParams);
  const page = Math.max(1, filters.page);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const totalItems = await buildClientSearchCount(filters.query);

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("clients")
    .select(
      "id,user_id,full_name,whatsapp,cpf,notes,created_at,updated_at,apuracoes(id,created_at)",
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.query) {
    query = query.or(
      `full_name.ilike.%${filters.query}%,whatsapp.ilike.%${filters.query}%,cpf.ilike.%${filters.query}%`,
    );
  }

  const { data, error } = await query.returns<ClientRow[]>();

  if (error) {
    throw new Error(`Falha ao listar clientes: ${error.message}`);
  }

  return {
    filters,
    data: (data ?? []).map(mapClient),
    pagination: buildPaginationMeta(page, totalItems),
  };
}

export async function getClientById(clientId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,user_id,full_name,whatsapp,cpf,notes,created_at,updated_at,apuracoes(id,created_at)",
    )
    .eq("id", clientId)
    .maybeSingle<ClientRow>();

  if (error) {
    throw new Error(`Falha ao carregar o cliente: ${error.message}`);
  }

  return data ? mapClient(data) : null;
}

export async function listApuracoesByClient(
  clientId: string,
  searchParams: SearchParamsInput,
) {
  await requireRole("user");

  const filters = parseApuracaoListFilters(searchParams);
  const page = Math.max(1, filters.page);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const totalItems = await buildApuracaoSearchCount({
    clientId,
    query: filters.query,
    status: filters.status,
  });

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("apuracoes")
    .select(
      "id,client_id,user_id,full_name,status,created_at,updated_at,clients(full_name),statement_files(id),transactions(id)",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.query) {
    query = query.ilike("full_name", `%${filters.query}%`);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.returns<ApuracaoRow[]>();

  if (error) {
    throw new Error(`Falha ao listar apurações: ${error.message}`);
  }

  return {
    filters,
    data: (data ?? []).map(mapApuracao),
    pagination: buildPaginationMeta(page, totalItems),
  };
}

export async function getApuracaoById(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("apuracoes")
    .select(
      "id,client_id,user_id,full_name,status,created_at,updated_at,clients(full_name),statement_files(id),transactions(id)",
    )
    .eq("id", apuracaoId)
    .maybeSingle<ApuracaoRow>();

  if (error) {
    throw new Error(`Falha ao carregar a apuração: ${error.message}`);
  }

  return data ? mapApuracao(data) : null;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const [
    clientsCount,
    apuracoesCount,
    reviewingCount,
    finalizedCount,
    draftCount,
    filesUploadedCount,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("apuracoes").select("id", { count: "exact", head: true }),
    supabase
      .from("apuracoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "reviewing"),
    supabase
      .from("apuracoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "finalized"),
    supabase
      .from("apuracoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("apuracoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "files_uploaded"),
  ]);

  const maybeThrow = (message: string, error: { message: string } | null) => {
    if (error) {
      throw new Error(`${message}: ${error.message}`);
    }
  };

  maybeThrow("Falha ao contar clientes", clientsCount.error);
  maybeThrow("Falha ao contar apurações", apuracoesCount.error);
  maybeThrow("Falha ao contar apurações em revisão", reviewingCount.error);
  maybeThrow("Falha ao contar apurações finalizadas", finalizedCount.error);
  maybeThrow("Falha ao contar apurações em rascunho", draftCount.error);
  maybeThrow(
    "Falha ao contar apurações com arquivos enviados",
    filesUploadedCount.error,
  );

  return {
    totalClients: clientsCount.count ?? 0,
    totalApuracoes: apuracoesCount.count ?? 0,
    reviewingApuracoes: reviewingCount.count ?? 0,
    finalizedApuracoes: finalizedCount.count ?? 0,
    draftApuracoes: draftCount.count ?? 0,
    filesUploadedApuracoes: filesUploadedCount.count ?? 0,
  };
}

export async function getDashboardFeed() {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const [clientsResult, apuracoesResult] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id,user_id,full_name,whatsapp,cpf,notes,created_at,updated_at,apuracoes(id,created_at)",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ClientRow[]>(),
    supabase
      .from("apuracoes")
      .select(
        "id,client_id,user_id,full_name,status,created_at,updated_at,clients(full_name),statement_files(id),transactions(id)",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ApuracaoRow[]>(),
  ]);

  if (clientsResult.error) {
    throw new Error(
      `Falha ao carregar clientes recentes: ${clientsResult.error.message}`,
    );
  }

  if (apuracoesResult.error) {
    throw new Error(
      `Falha ao carregar apurações recentes: ${apuracoesResult.error.message}`,
    );
  }

  return {
    recentClients: (clientsResult.data ?? []).map(mapClient),
    recentApuracoes: (apuracoesResult.data ?? []).map(mapApuracao),
  };
}

export async function listStatementFiles(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("statement_files")
    .select(
      "id,apuracao_id,user_id,file_name,original_file_name,storage_bucket,storage_path,mime_type,file_size,processing_status,detected_bank_name,detected_account_label,page_count,extracted_text,processing_error,created_at,updated_at",
    )
    .eq("apuracao_id", apuracaoId)
    .order("created_at", { ascending: false })
    .returns<StatementFileRow[]>();

  if (error) {
    throw new Error(`Falha ao listar extratos: ${error.message}`);
  }

  return (data ?? []).map(mapStatementFile);
}

export async function listFileProcessingLogs(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("file_processing_logs")
    .select(
      "id,statement_file_id,stage,status,message,metadata,created_at,statement_files!inner(apuracao_id)",
    )
    .eq("statement_files.apuracao_id", apuracaoId)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<(FileProcessingLogRow & { statement_files: { apuracao_id: string } })[]>();

  if (error) {
    throw new Error(`Falha ao listar logs de processamento: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapFileProcessingLog({
      id: row.id,
      statement_file_id: row.statement_file_id,
      stage: row.stage,
      status: row.status,
      message: row.message,
      metadata: row.metadata,
      created_at: row.created_at,
    }),
  );
}

export async function listTransactionsByApuracao(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,apuracao_id,statement_file_id,bank_name,account_label,transaction_date,description,amount,direction,month_ref,year_ref,extraction_confidence,original_text,transaction_hash,is_duplicate,created_at,updated_at,transaction_reviews(id,transaction_id,decision,exclusion_reason,review_note,reviewed_by,reviewed_at,created_at,updated_at)",
    )
    .eq("apuracao_id", apuracaoId)
    .order("transaction_date", { ascending: false })
    .limit(50)
    .returns<TransactionRow[]>();

  if (error) {
    throw new Error(`Falha ao listar transações extraídas: ${error.message}`);
  }

  return (data ?? []).map(mapTransaction);
}

export async function listReviewableTransactionsByApuracao(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,apuracao_id,statement_file_id,bank_name,account_label,transaction_date,description,amount,direction,month_ref,year_ref,extraction_confidence,original_text,transaction_hash,is_duplicate,created_at,updated_at,transaction_reviews(id,transaction_id,decision,exclusion_reason,review_note,reviewed_by,reviewed_at,created_at,updated_at)",
    )
    .eq("apuracao_id", apuracaoId)
    .order("transaction_date", { ascending: false })
    .returns<TransactionRow[]>();

  if (error) {
    throw new Error(`Falha ao listar transações para revisão: ${error.message}`);
  }

  return (data ?? []).map(mapReviewableTransaction);
}

export async function listAuditLogsByApuracao(apuracaoId: string) {
  await requireRole("user");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,entity_type,entity_id,action,actor_user_id,apuracao_id,payload,created_at")
    .eq("apuracao_id", apuracaoId)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<AuditLogRow[]>();

  if (error) {
    throw new Error(`Falha ao listar auditoria da apuração: ${error.message}`);
  }

  return (data ?? []).map(mapAuditLog);
}

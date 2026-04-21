import "server-only";

import { generatedExcelsBucket } from "@/lib/constants/storage";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildGeneratedExcelStoragePath,
  uploadGeneratedExcelToStorage,
} from "@/lib/excel/storage";
import {
  buildApuracaoVaziaFileName,
  renderApuracaoVazia,
  type KeptTransaction,
} from "@/lib/excel/template-renderer";
import { refreshMonthlySummaries } from "@/lib/summaries/service";
import type {
  ExcelTemplateMappingConfig,
  ExcelTemplateRecord,
  GeneratedExcelRecord,
} from "@/types/domain";

type KeptCreditTransactionRow = {
  id: string;
  transaction_date: string;
  amount: number;
  month_ref: number;
  year_ref: number;
  direction: "credit" | "debit";
  bank_name: string | null;
  description: string | null;
};

type ExcelTemplateRow = {
  id: string;
  uploaded_by: string | null;
  file_name: string;
  original_file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  version_number: number;
  is_active: boolean;
  mapping_config: ExcelTemplateMappingConfig;
  created_at: string;
  updated_at: string;
};

type ApuracaoExcelRow = {
  id: string;
  full_name: string;
  clients: { full_name: string } | null;
};

type GeneratedExcelRow = {
  id: string;
  apuracao_id: string;
  template_id: string | null;
  generated_by: string | null;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  template_version: number | null;
  created_at: string;
};

function mapTemplate(row: ExcelTemplateRow): ExcelTemplateRecord {
  return {
    id: row.id,
    uploadedBy: row.uploaded_by,
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    versionNumber: row.version_number,
    isActive: row.is_active,
    mappingConfig: row.mapping_config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGeneratedExcel(row: GeneratedExcelRow): GeneratedExcelRecord {
  return {
    id: row.id,
    apuracaoId: row.apuracao_id,
    templateId: row.template_id,
    generatedBy: row.generated_by,
    fileName: row.file_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    templateVersion: row.template_version,
    createdAt: row.created_at,
  };
}

async function getActiveExcelTemplate() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("excel_templates")
    .select(
      "id,uploaded_by,file_name,original_file_name,storage_bucket,storage_path,mime_type,file_size,version_number,is_active,mapping_config,created_at,updated_at",
    )
    .eq("is_active", true)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle<ExcelTemplateRow>();

  if (error) {
    throw new Error(`Falha ao carregar template Excel ativo: ${error.message}`);
  }

  return data ? mapTemplate(data) : null;
}

async function getApuracaoExcelContext(apuracaoId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("apuracoes")
    .select("id,full_name,clients(full_name)")
    .eq("id", apuracaoId)
    .maybeSingle<ApuracaoExcelRow>();

  if (error || !data) {
    throw new Error(
      `Falha ao carregar contexto da apuracao para Excel: ${error?.message ?? "registro ausente"}`,
    );
  }

  return data;
}

async function loadKeptCreditTransactions(apuracaoId: string): Promise<KeptTransaction[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("transactions")
    .select(
      "id,transaction_date,amount,month_ref,year_ref,direction,bank_name,description,transaction_reviews!inner(decision)",
    )
    .eq("apuracao_id", apuracaoId)
    .eq("direction", "credit")
    .eq("transaction_reviews.decision", "manter")
    .returns<Array<KeptCreditTransactionRow & { transaction_reviews: { decision: string } }>>();

  if (error) {
    throw new Error(`Falha ao carregar transacoes mantidas: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    transactionDate: row.transaction_date,
    amount: Number(row.amount),
    monthRef: row.month_ref,
    yearRef: row.year_ref,
    bankName: row.bank_name,
    description: row.description,
  }));
}

export async function generateExcelForApuracao(params: {
  apuracaoId: string;
  generatedBy: string;
}) {
  const [apuracaoContext, summaryResult, keptTransactions] = await Promise.all([
    getApuracaoExcelContext(params.apuracaoId),
    refreshMonthlySummaries(params.apuracaoId),
    loadKeptCreditTransactions(params.apuracaoId),
  ]);

  if (keptTransactions.length === 0) {
    throw new Error(
      "Nao ha entradas de credito mantidas para gerar o Excel. Revise as transacoes antes de exportar.",
    );
  }

  const clientName = apuracaoContext.clients?.full_name ?? apuracaoContext.full_name;
  const apuracaoName = apuracaoContext.full_name;
  const generatedAt = new Date();

  const outputBuffer = await renderApuracaoVazia({
    clientName,
    apuracaoName,
    generatedAt,
    transactions: keptTransactions,
  });

  const fileName = buildApuracaoVaziaFileName({
    clientName,
    createdAt: generatedAt,
  });
  const storagePath = buildGeneratedExcelStoragePath({
    apuracaoId: params.apuracaoId,
    fileName,
  });

  await uploadGeneratedExcelToStorage({
    storagePath,
    fileBuffer: outputBuffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const template = await getActiveExcelTemplate();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("generated_excels")
    .insert({
      apuracao_id: params.apuracaoId,
      template_id: template?.id ?? null,
      generated_by: params.generatedBy,
      file_name: fileName,
      storage_bucket: generatedExcelsBucket,
      storage_path: storagePath,
      template_version: template?.versionNumber ?? null,
    })
    .select(
      "id,apuracao_id,template_id,generated_by,file_name,storage_bucket,storage_path,template_version,created_at",
    )
    .single<GeneratedExcelRow>();

  if (error || !data) {
    throw new Error(
      `Falha ao registrar Excel gerado: ${error?.message ?? "sem retorno do banco"}`,
    );
  }

  return {
    generatedExcel: mapGeneratedExcel(data),
    template,
    monthsCount: summaryResult.monthlySummaries.length,
    transactionsCount: keptTransactions.length,
  };
}

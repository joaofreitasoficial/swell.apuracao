import "server-only";

import { extractTransactionsFromStatement } from "@/lib/statements/extractors";
import { buildTransactionHash } from "@/lib/statements/extractors/normalizers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { detectAccountLabel, detectBankName } from "@/lib/statements/detectors";
import { extractPdfData } from "@/lib/statements/pdf";
import { downloadStatementFileFromStorage } from "@/lib/statements/storage";
import type { StatementFileStatus } from "@/types/domain";

type StatementFileProcessingRow = {
  id: string;
  apuracao_id: string;
  user_id: string;
  storage_path: string;
  original_file_name: string;
};

async function insertProcessingLog(params: {
  statementFileId: string;
  stage: string;
  status: "info" | "success" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();

  await admin.from("file_processing_logs").insert({
    statement_file_id: params.statementFileId,
    stage: params.stage,
    status: params.status,
    message: params.message,
    metadata: params.metadata ?? null,
  });
}

async function updateStatementFileStatus(params: {
  statementFileId: string;
  status: StatementFileStatus;
  detectedBankName?: string | null;
  detectedAccountLabel?: string | null;
  pageCount?: number | null;
  extractedText?: string | null;
  processingError?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("statement_files")
    .update({
      processing_status: params.status,
      detected_bank_name: params.detectedBankName ?? null,
      detected_account_label: params.detectedAccountLabel ?? null,
      page_count: params.pageCount ?? null,
      extracted_text: params.extractedText ?? null,
      processing_error: params.processingError ?? null,
    })
    .eq("id", params.statementFileId);

  if (error) {
    throw new Error(`Falha ao atualizar o extrato processado: ${error.message}`);
  }
}

export async function syncApuracaoProcessingStatus(apuracaoId: string) {
  const admin = createAdminSupabaseClient();
  const [filesResult, transactionsResult] = await Promise.all([
    admin
      .from("statement_files")
      .select("processing_status")
      .eq("apuracao_id", apuracaoId)
      .returns<Array<{ processing_status: StatementFileStatus }>>(),
    admin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("apuracao_id", apuracaoId),
  ]);

  if (filesResult.error) {
    throw new Error(
      `Falha ao sincronizar status da apuração: ${filesResult.error.message}`,
    );
  }

  if (transactionsResult.error) {
    throw new Error(
      `Falha ao contar transações da apuração: ${transactionsResult.error.message}`,
    );
  }

  const statuses = (filesResult.data ?? []).map((item) => item.processing_status);
  const transactionsCount = transactionsResult.count ?? 0;

  let nextStatus: "draft" | "processing" | "files_uploaded" | "reviewing" =
    "draft";

  if (statuses.length === 0) {
    nextStatus = "draft";
  } else if (
    statuses.some((status) => status === "processing" || status === "failed")
  ) {
    nextStatus = "processing";
  } else if (transactionsCount > 0) {
    nextStatus = "reviewing";
  } else {
    nextStatus = "files_uploaded";
  }

  const { error: updateError } = await admin
    .from("apuracoes")
    .update({ status: nextStatus })
    .eq("id", apuracaoId);

  if (updateError) {
    throw new Error(
      `Falha ao atualizar status da apuração: ${updateError.message}`,
    );
  }
}

async function persistTransactionsForStatementFile(params: {
  statementFileId: string;
  apuracaoId: string;
  bankName: string | null;
  accountLabel: string | null;
  extractedText: string;
}) {
  const admin = createAdminSupabaseClient();

  await admin.from("duplicate_checks").delete().eq("statement_file_id", params.statementFileId);
  await admin.from("transactions").delete().eq("statement_file_id", params.statementFileId);
  await admin.from("raw_extractions").delete().eq("statement_file_id", params.statementFileId);

  const extraction = await extractTransactionsFromStatement({
    statementFileId: params.statementFileId,
    apuracaoId: params.apuracaoId,
    text: params.extractedText,
    bankName: params.bankName,
    accountLabel: params.accountLabel,
  });

  const { data: rawExtraction, error: rawExtractionError } = await admin
    .from("raw_extractions")
    .insert({
      statement_file_id: params.statementFileId,
      extractor_kind: extraction.adapterName,
      model_name: extraction.modelName ?? null,
      source_text: params.extractedText,
      raw_output: extraction.rawOutput ?? null,
      normalized_output: extraction.transactions,
      success: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (rawExtractionError || !rawExtraction) {
    throw new Error(
      `Falha ao registrar extração bruta: ${rawExtractionError?.message ?? "sem retorno do banco"}`,
    );
  }

  const { data: existingTransactions, error: existingTransactionsError } = await admin
    .from("transactions")
    .select("id,transaction_hash")
    .eq("apuracao_id", params.apuracaoId)
    .neq("statement_file_id", params.statementFileId)
    .returns<Array<{ id: string; transaction_hash: string }>>();

  if (existingTransactionsError) {
    throw new Error(
      `Falha ao carregar hashes existentes para duplicidade: ${existingTransactionsError.message}`,
    );
  }

  const hashToTransactionId = new Map(
    (existingTransactions ?? []).map((transaction) => [
      transaction.transaction_hash,
      transaction.id,
    ]),
  );

  if (extraction.transactions.length === 0) {
    return {
      adapterName: extraction.adapterName,
      transactionCount: 0,
      duplicateCount: 0,
    };
  }

  const transactionRows = extraction.transactions.map((candidate) => {
    const transactionHash = buildTransactionHash({
      apuracaoId: params.apuracaoId,
      bankName: params.bankName,
      accountLabel: params.accountLabel,
      candidate,
    });
    const matchedTransactionId = hashToTransactionId.get(transactionHash) ?? null;
    const [year, month] = candidate.transactionDate.split("-").map(Number);

    return {
      apuracao_id: params.apuracaoId,
      statement_file_id: params.statementFileId,
      raw_extraction_id: rawExtraction.id,
      bank_name: params.bankName ?? "Desconhecido",
      account_label: params.accountLabel,
      transaction_date: candidate.transactionDate,
      description: candidate.description,
      amount: candidate.amount,
      direction: candidate.direction,
      month_ref: month,
      year_ref: year,
      extraction_confidence: candidate.extractionConfidence,
      original_text: candidate.originalText,
      transaction_hash: transactionHash,
      is_duplicate: Boolean(matchedTransactionId),
      matchedTransactionId,
    };
  });

  const rowsToInsert = transactionRows.map((row) => ({
    apuracao_id: row.apuracao_id,
    statement_file_id: row.statement_file_id,
    raw_extraction_id: row.raw_extraction_id,
    bank_name: row.bank_name,
    account_label: row.account_label,
    transaction_date: row.transaction_date,
    description: row.description,
    amount: row.amount,
    direction: row.direction,
    month_ref: row.month_ref,
    year_ref: row.year_ref,
    extraction_confidence: row.extraction_confidence,
    original_text: row.original_text,
    transaction_hash: row.transaction_hash,
    is_duplicate: row.is_duplicate,
  }));

  const { data: insertedTransactions, error: insertTransactionsError } = await admin
    .from("transactions")
    .insert(rowsToInsert)
    .select("id,transaction_hash")
    .returns<Array<{ id: string; transaction_hash: string }>>();

  if (insertTransactionsError) {
    throw new Error(
      `Falha ao salvar transações estruturadas: ${insertTransactionsError.message}`,
    );
  }

  const insertedMap = new Map(
    (insertedTransactions ?? []).map((transaction) => [
      transaction.transaction_hash,
      transaction.id,
    ]),
  );

  const { error: duplicateChecksError } = await admin.from("duplicate_checks").insert(
    transactionRows.map((row) => ({
      apuracao_id: params.apuracaoId,
      statement_file_id: params.statementFileId,
      transaction_hash: row.transaction_hash,
      transaction_id: insertedMap.get(row.transaction_hash) ?? null,
      matched_transaction_id: row.matchedTransactionId,
      is_duplicate: Boolean(row.matchedTransactionId),
    })),
  );

  if (duplicateChecksError) {
    throw new Error(
      `Falha ao registrar análise de duplicidade: ${duplicateChecksError.message}`,
    );
  }

  return {
    adapterName: extraction.adapterName,
    transactionCount: transactionRows.length,
    duplicateCount: transactionRows.filter((row) => row.is_duplicate).length,
  };
}

export async function processStatementFile(statementFileId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("statement_files")
    .select("id,apuracao_id,user_id,storage_path,original_file_name")
    .eq("id", statementFileId)
    .maybeSingle<StatementFileProcessingRow>();

  if (error || !data) {
    throw new Error(
      `Falha ao carregar o extrato para processamento: ${error?.message ?? "registro ausente"}`,
    );
  }

  await updateStatementFileStatus({
    statementFileId,
    status: "processing",
  });
  await syncApuracaoProcessingStatus(data.apuracao_id);
  await insertProcessingLog({
    statementFileId,
    stage: "queued",
    status: "info",
    message: "Processamento iniciado.",
    metadata: {
      fileName: data.original_file_name,
    },
  });

  try {
    const fileBuffer = await downloadStatementFileFromStorage(data.storage_path);
    await insertProcessingLog({
      statementFileId,
      stage: "download",
      status: "success",
      message: "Arquivo baixado do Storage.",
      metadata: {
        bytes: fileBuffer.byteLength,
      },
    });

    const extraction = await extractPdfData(fileBuffer);
    const detectedBankName = detectBankName(extraction.text);
    const detectedAccountLabel = detectAccountLabel(extraction.text);

    await updateStatementFileStatus({
      statementFileId,
      status: "processed",
      detectedBankName,
      detectedAccountLabel,
      pageCount: extraction.pageCount,
      extractedText: extraction.text,
      processingError: null,
    });

    await insertProcessingLog({
      statementFileId,
      stage: extraction.ocrUsed ? "ocr_fallback" : "pdf_parse",
      status: "success",
      message: extraction.ocrUsed
        ? "OCR executado como fallback."
        : "Texto extraído com pdf-parse.",
      metadata: {
        pageCount: extraction.pageCount,
        textLength: extraction.text.length,
        detectedBankName,
        detectedAccountLabel,
      },
    });

    const transactionExtraction = await persistTransactionsForStatementFile({
      statementFileId,
      apuracaoId: data.apuracao_id,
      bankName: detectedBankName,
      accountLabel: detectedAccountLabel,
      extractedText: extraction.text,
    });

    await insertProcessingLog({
      statementFileId,
      stage: "transaction_extraction",
      status: "success",
      message: "Movimentações estruturadas salvas com sucesso.",
      metadata: {
        adapterName: transactionExtraction.adapterName,
        transactionCount: transactionExtraction.transactionCount,
        duplicateCount: transactionExtraction.duplicateCount,
      },
    });
  } catch (processingError) {
    const message =
      processingError instanceof Error
        ? processingError.message
        : "Falha desconhecida no processamento.";

    await updateStatementFileStatus({
      statementFileId,
      status: "failed",
      processingError: message,
    });

    await insertProcessingLog({
      statementFileId,
      stage: "processing",
      status: "error",
      message,
    });
  } finally {
    await syncApuracaoProcessingStatus(data.apuracao_id);
  }
}

export async function enqueueStatementFileProcessing(statementFileId: string) {
  await processStatementFile(statementFileId);
}

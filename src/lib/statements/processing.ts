import "server-only";

import { extractTransactionsFromStatement } from "@/lib/statements/extractors";
import { buildTransactionHash } from "@/lib/statements/extractors/normalizers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { detectAccountLabel, detectBankName } from "@/lib/statements/detectors";
import { extractPdfData } from "@/lib/statements/pdf";
import { downloadStatementFileFromStorage } from "@/lib/statements/storage";
import type {
  ExclusionReason,
  ReprocessingDiffItem,
  ReprocessingDiffSummary,
  ReprocessingJobTrigger,
  ReviewDecision,
  StatementFileStatus,
} from "@/types/domain";

type StatementFileProcessingRow = {
  id: string;
  apuracao_id: string;
  user_id: string;
  storage_path: string;
  original_file_name: string;
};

type ExistingTransactionRow = {
  id: string;
  apuracao_id: string;
  statement_file_id: string;
  bank_name: string;
  account_label: string | null;
  transaction_date: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  month_ref: number;
  year_ref: number;
  extraction_confidence: number;
  original_text: string;
  transaction_hash: string;
  is_duplicate: boolean;
  created_at: string;
  updated_at: string;
  transaction_reviews:
    | {
        id: string;
        transaction_id: string;
        decision: ReviewDecision;
        exclusion_reason: ExclusionReason | null;
        review_note: string | null;
        reviewed_by: string | null;
        reviewed_at: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;
};

type InsertedTransactionRow = {
  id: string;
  transaction_hash: string;
};

type ReprocessingStats = {
  adapterName: string;
  transactionCount: number;
  duplicateCount: number;
  removedCount: number;
  preservedReviewCount: number;
  pendingCount: number;
  diffSummary: ReprocessingDiffSummary;
};

function buildDiffItemFromExistingTransaction(
  transaction: ExistingTransactionRow,
): ReprocessingDiffItem {
  return {
    transactionHash: transaction.transaction_hash,
    transactionDate: transaction.transaction_date,
    description: transaction.description,
    amount: transaction.amount,
    direction: transaction.direction,
  };
}

function buildDiffItemFromCandidate(params: {
  transactionHash: string;
  transactionDate: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
}): ReprocessingDiffItem {
  return {
    transactionHash: params.transactionHash,
    transactionDate: params.transactionDate,
    description: params.description,
    amount: params.amount,
    direction: params.direction,
  };
}

function buildOccurrences(items: ReprocessingDiffItem[]) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    counts.set(item.transactionHash, (counts.get(item.transactionHash) ?? 0) + 1);
  });

  return counts;
}

function computeAddedItems(params: {
  currentItems: ReprocessingDiffItem[];
  previousItems: ReprocessingDiffItem[];
}) {
  const previousCounts = buildOccurrences(params.previousItems);
  const seenCounts = new Map<string, number>();

  return params.currentItems.filter((item) => {
    const nextSeenCount = (seenCounts.get(item.transactionHash) ?? 0) + 1;
    seenCounts.set(item.transactionHash, nextSeenCount);

    return nextSeenCount > (previousCounts.get(item.transactionHash) ?? 0);
  });
}

function computeRemovedItems(params: {
  currentItems: ReprocessingDiffItem[];
  previousItems: ReprocessingDiffItem[];
}) {
  const currentCounts = buildOccurrences(params.currentItems);
  const seenCounts = new Map<string, number>();

  return params.previousItems.filter((item) => {
    const nextSeenCount = (seenCounts.get(item.transactionHash) ?? 0) + 1;
    seenCounts.set(item.transactionHash, nextSeenCount);

    return nextSeenCount > (currentCounts.get(item.transactionHash) ?? 0);
  });
}

function limitDiffItems(items: ReprocessingDiffItem[]) {
  return items.slice(0, 12);
}

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

async function createReprocessingJob(params: {
  apuracaoId: string;
  statementFileId: string;
  triggerType: ReprocessingJobTrigger;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("reprocessing_jobs")
    .insert({
      apuracao_id: params.apuracaoId,
      statement_file_id: params.statementFileId,
      trigger_type: params.triggerType,
      status: "processing",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(
      `Falha ao criar job de reprocessamento: ${error?.message ?? "sem retorno do banco"}`,
    );
  }

  return data.id;
}

async function finishReprocessingJob(params: {
  jobId: string;
  status: "completed" | "failed";
  stats?: ReprocessingStats;
  errorMessage?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("reprocessing_jobs")
    .update({
      status: params.status,
      inserted_count: params.stats?.transactionCount ?? 0,
      removed_count: params.stats?.removedCount ?? 0,
      preserved_review_count: params.stats?.preservedReviewCount ?? 0,
      pending_count: params.stats?.pendingCount ?? 0,
      duplicate_count: params.stats?.duplicateCount ?? 0,
      diff_summary: params.stats?.diffSummary ?? null,
      error_message: params.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", params.jobId);

  if (error) {
    throw new Error(`Falha ao finalizar job de reprocessamento: ${error.message}`);
  }
}

async function captureExistingTransactionsForStatementFile(statementFileId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("transactions")
    .select(
      "id,apuracao_id,statement_file_id,bank_name,account_label,transaction_date,description,amount,direction,month_ref,year_ref,extraction_confidence,original_text,transaction_hash,is_duplicate,created_at,updated_at,transaction_reviews(id,transaction_id,decision,exclusion_reason,review_note,reviewed_by,reviewed_at,created_at,updated_at)",
    )
    .eq("statement_file_id", statementFileId)
    .order("created_at", { ascending: true })
    .returns<ExistingTransactionRow[]>();

  if (error) {
    throw new Error(
      `Falha ao carregar transacoes existentes do arquivo: ${error.message}`,
    );
  }

  return data ?? [];
}

async function insertTransactionVersions(params: {
  jobId: string;
  apuracaoId: string;
  statementFileId: string;
  versionKind: "previous" | "current";
  rows: Array<{
    transactionId: string | null;
    transactionHash: string;
    reviewWasPreserved: boolean;
    snapshot: Record<string, unknown>;
  }>;
}) {
  if (params.rows.length === 0) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("transaction_versions").insert(
    params.rows.map((row) => ({
      reprocessing_job_id: params.jobId,
      apuracao_id: params.apuracaoId,
      statement_file_id: params.statementFileId,
      transaction_id: row.transactionId,
      transaction_hash: row.transactionHash,
      version_kind: params.versionKind,
      review_was_preserved: row.reviewWasPreserved,
      snapshot: row.snapshot,
    })),
  );

  if (error) {
    throw new Error(`Falha ao salvar versoes da transacao: ${error.message}`);
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
      `Falha ao sincronizar status da apuracao: ${filesResult.error.message}`,
    );
  }

  if (transactionsResult.error) {
    throw new Error(
      `Falha ao contar transacoes da apuracao: ${transactionsResult.error.message}`,
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
      `Falha ao atualizar status da apuracao: ${updateError.message}`,
    );
  }
}

async function persistTransactionsForStatementFile(params: {
  statementFileId: string;
  apuracaoId: string;
  bankName: string | null;
  accountLabel: string | null;
  extractedText: string;
  reprocessingJobId: string;
}) {
  const admin = createAdminSupabaseClient();
  const previousTransactions = await captureExistingTransactionsForStatementFile(
    params.statementFileId,
  );

  await insertTransactionVersions({
    jobId: params.reprocessingJobId,
    apuracaoId: params.apuracaoId,
    statementFileId: params.statementFileId,
    versionKind: "previous",
    rows: previousTransactions.map((transaction) => ({
      transactionId: transaction.id,
      transactionHash: transaction.transaction_hash,
      reviewWasPreserved: false,
      snapshot: {
        transaction,
        review: transaction.transaction_reviews,
      },
    })),
  });

  const previousTransactionsByHash = new Map(
    previousTransactions.map((transaction) => [transaction.transaction_hash, transaction]),
  );
  const previousDiffItems = previousTransactions.map(
    buildDiffItemFromExistingTransaction,
  );

  await admin
    .from("duplicate_checks")
    .delete()
    .eq("statement_file_id", params.statementFileId);
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
      `Falha ao registrar extracao bruta: ${rawExtractionError?.message ?? "sem retorno do banco"}`,
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

  const hashToExistingTransactionId = new Map(
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
      removedCount: previousTransactions.length,
      preservedReviewCount: 0,
      pendingCount: 0,
      diffSummary: {
        added: [],
        removed: limitDiffItems(previousDiffItems),
        reviewPreserved: [],
      },
    } satisfies ReprocessingStats;
  }

  const batchSeenHashes = new Set<string>();
  const transactionRows = extraction.transactions.map((candidate) => {
    const transactionHash = buildTransactionHash({
      apuracaoId: params.apuracaoId,
      bankName: params.bankName,
      accountLabel: params.accountLabel,
      candidate,
    });
    const matchedTransactionId =
      hashToExistingTransactionId.get(transactionHash) ?? null;
    const isDuplicateInBatch = batchSeenHashes.has(transactionHash);
    batchSeenHashes.add(transactionHash);
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
      is_duplicate: Boolean(matchedTransactionId) || isDuplicateInBatch,
      matchedTransactionId,
    };
  });

  const { data: insertedTransactions, error: insertTransactionsError } = await admin
    .from("transactions")
    .insert(
      transactionRows.map((row) => ({
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
      })),
    )
    .select("id,transaction_hash")
    .returns<InsertedTransactionRow[]>();

  if (insertTransactionsError || !insertedTransactions) {
    throw new Error(
      `Falha ao salvar transacoes estruturadas: ${insertTransactionsError?.message ?? "sem retorno do banco"}`,
    );
  }

  const reviewRows = insertedTransactions.map((transaction, index) => {
    const sourceRow = transactionRows[index];
    const previousTransaction =
      previousTransactionsByHash.get(sourceRow.transaction_hash) ?? null;
    const previousReview = previousTransaction?.transaction_reviews ?? null;

    return {
      transaction_id: transaction.id,
      decision: previousReview?.decision ?? ("pendente" satisfies ReviewDecision),
      exclusion_reason: previousReview?.exclusion_reason ?? null,
      review_note: previousReview?.review_note ?? null,
      reviewed_by: previousReview?.reviewed_by ?? null,
      reviewed_at: previousReview?.reviewed_at ?? null,
    };
  });

  const { error: reviewsError } = await admin
    .from("transaction_reviews")
    .insert(reviewRows);

  if (reviewsError) {
    throw new Error(`Falha ao restaurar reviews apos reprocessamento: ${reviewsError.message}`);
  }

  const firstInsertedTransactionByHash = new Map<string, string>();
  const duplicateChecksRows = insertedTransactions.map((transaction, index) => {
    const sourceRow = transactionRows[index];
    const matchedFromBatch =
      firstInsertedTransactionByHash.get(sourceRow.transaction_hash) ?? null;

    if (!firstInsertedTransactionByHash.has(sourceRow.transaction_hash)) {
      firstInsertedTransactionByHash.set(sourceRow.transaction_hash, transaction.id);
    }

    return {
      apuracao_id: params.apuracaoId,
      statement_file_id: params.statementFileId,
      transaction_hash: sourceRow.transaction_hash,
      transaction_id: transaction.id,
      matched_transaction_id: sourceRow.matchedTransactionId ?? matchedFromBatch,
      is_duplicate: sourceRow.is_duplicate,
    };
  });

  const { error: duplicateChecksError } = await admin
    .from("duplicate_checks")
    .insert(duplicateChecksRows);

  if (duplicateChecksError) {
    throw new Error(
      `Falha ao registrar analise de duplicidade: ${duplicateChecksError.message}`,
    );
  }

  const currentDiffItems = transactionRows.map((row) =>
    buildDiffItemFromCandidate({
      transactionHash: row.transaction_hash,
      transactionDate: row.transaction_date,
      description: row.description,
      amount: row.amount,
      direction: row.direction,
    }),
  );
  const addedItems = computeAddedItems({
    currentItems: currentDiffItems,
    previousItems: previousDiffItems,
  });
  const removedItems = computeRemovedItems({
    currentItems: currentDiffItems,
    previousItems: previousDiffItems,
  });
  const preservedItems = transactionRows
    .filter((row) => {
      const previousReview =
        previousTransactionsByHash.get(row.transaction_hash)?.transaction_reviews ?? null;
      return Boolean(previousReview && previousReview.decision !== "pendente");
    })
    .map((row) =>
      buildDiffItemFromCandidate({
        transactionHash: row.transaction_hash,
        transactionDate: row.transaction_date,
        description: row.description,
        amount: row.amount,
        direction: row.direction,
      }),
    );

  await insertTransactionVersions({
    jobId: params.reprocessingJobId,
    apuracaoId: params.apuracaoId,
    statementFileId: params.statementFileId,
    versionKind: "current",
    rows: insertedTransactions.map((transaction, index) => {
      const sourceRow = transactionRows[index];
      const previousReview =
        previousTransactionsByHash.get(sourceRow.transaction_hash)?.transaction_reviews ?? null;

      return {
        transactionId: transaction.id,
        transactionHash: sourceRow.transaction_hash,
        reviewWasPreserved: Boolean(previousReview && previousReview.decision !== "pendente"),
        snapshot: {
          transaction: {
            ...sourceRow,
            id: transaction.id,
          },
          review: reviewRows[index],
        },
      };
    }),
  });

  const preservedReviewCount = reviewRows.filter(
    (row) => row.decision !== "pendente",
  ).length;

  return {
    adapterName: extraction.adapterName,
    transactionCount: transactionRows.length,
    duplicateCount: transactionRows.filter((row) => row.is_duplicate).length,
    removedCount: previousTransactions.length,
    preservedReviewCount,
    pendingCount: transactionRows.length - preservedReviewCount,
    diffSummary: {
      added: limitDiffItems(addedItems),
      removed: limitDiffItems(removedItems),
      reviewPreserved: limitDiffItems(preservedItems),
    },
  } satisfies ReprocessingStats;
}

export async function processStatementFile(
  statementFileId: string,
  triggerType: ReprocessingJobTrigger = "upload",
) {
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

  const reprocessingJobId = await createReprocessingJob({
    apuracaoId: data.apuracao_id,
    statementFileId,
    triggerType,
  });

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
      triggerType,
      reprocessingJobId,
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
        reprocessingJobId,
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
        : "Texto extraido com pdf-parse.",
      metadata: {
        pageCount: extraction.pageCount,
        textLength: extraction.text.length,
        detectedBankName,
        detectedAccountLabel,
        reprocessingJobId,
      },
    });

    const transactionExtraction = await persistTransactionsForStatementFile({
      statementFileId,
      apuracaoId: data.apuracao_id,
      bankName: detectedBankName,
      accountLabel: detectedAccountLabel,
      extractedText: extraction.text,
      reprocessingJobId,
    });

    await insertProcessingLog({
      statementFileId,
      stage: "transaction_extraction",
      status: "success",
      message: "Movimentacoes estruturadas salvas com merge incremental.",
      metadata: {
        adapterName: transactionExtraction.adapterName,
        transactionCount: transactionExtraction.transactionCount,
        duplicateCount: transactionExtraction.duplicateCount,
        removedCount: transactionExtraction.removedCount,
        preservedReviewCount: transactionExtraction.preservedReviewCount,
        pendingCount: transactionExtraction.pendingCount,
        reprocessingJobId,
      },
    });

    await finishReprocessingJob({
      jobId: reprocessingJobId,
      status: "completed",
      stats: transactionExtraction,
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
      metadata: {
        reprocessingJobId,
      },
    });

    await finishReprocessingJob({
      jobId: reprocessingJobId,
      status: "failed",
      errorMessage: message,
    });
  } finally {
    await syncApuracaoProcessingStatus(data.apuracao_id);
  }
}

export async function enqueueStatementFileProcessing(
  statementFileId: string,
  triggerType: ReprocessingJobTrigger = "upload",
) {
  await processStatementFile(statementFileId, triggerType);
}

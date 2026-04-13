import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  ExclusionReason,
  ReviewDecision,
  TransactionReviewRecord,
} from "@/types/domain";

type ReviewMutationPayload = {
  transactionId: string;
  decision: ReviewDecision;
  exclusionReason?: ExclusionReason | null;
  reviewNote?: string | null;
};

async function getTransactionOwnership(transactionId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("transactions")
    .select("id,apuracao_id")
    .eq("id", transactionId)
    .maybeSingle<{ id: string; apuracao_id: string }>();

  if (error || !data) {
    throw new Error(
      `Falha ao localizar a transação para revisão: ${error?.message ?? "registro ausente"}`,
    );
  }

  return data;
}

async function insertAuditLog(params: {
  apuracaoId: string;
  actorUserId: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("audit_logs").insert({
    entity_type: "transaction_review",
    entity_id: params.entityId,
    action: params.action,
    actor_user_id: params.actorUserId,
    apuracao_id: params.apuracaoId,
    payload: params.payload,
  });

  if (error) {
    throw new Error(`Falha ao registrar auditoria: ${error.message}`);
  }
}

function normalizeReviewFields(payload: ReviewMutationPayload) {
  const exclusionReason =
    payload.decision === "excluir" ? (payload.exclusionReason ?? null) : null;
  const reviewNote = payload.reviewNote?.trim() ? payload.reviewNote.trim() : null;

  return {
    exclusionReason,
    reviewNote,
  };
}

export async function upsertTransactionReview(params: {
  actorUserId: string;
  payload: ReviewMutationPayload;
}) {
  const admin = createAdminSupabaseClient();
  const transaction = await getTransactionOwnership(params.payload.transactionId);
  const { exclusionReason, reviewNote } = normalizeReviewFields(params.payload);
  const reviewedAt =
    params.payload.decision === "pendente"
      ? null
      : new Date().toISOString();

  const { data: existing, error: existingError } = await admin
    .from("transaction_reviews")
    .select(
      "id,transaction_id,decision,exclusion_reason,review_note,reviewed_by,reviewed_at,created_at,updated_at",
    )
    .eq("transaction_id", params.payload.transactionId)
    .maybeSingle<{
      id: string;
      transaction_id: string;
      decision: ReviewDecision;
      exclusion_reason: ExclusionReason | null;
      review_note: string | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    }>();

  if (existingError) {
    throw new Error(`Falha ao carregar revisão existente: ${existingError.message}`);
  }

  const mutationPayload = {
    transaction_id: params.payload.transactionId,
    decision: params.payload.decision,
    exclusion_reason: exclusionReason,
    review_note: reviewNote,
    reviewed_by: params.payload.decision === "pendente" ? null : params.actorUserId,
    reviewed_at: reviewedAt,
  };

  const { data, error } = await admin
    .from("transaction_reviews")
    .upsert(mutationPayload, {
      onConflict: "transaction_id",
    })
    .select(
      "id,transaction_id,decision,exclusion_reason,review_note,reviewed_by,reviewed_at,created_at,updated_at",
    )
    .single<{
      id: string;
      transaction_id: string;
      decision: ReviewDecision;
      exclusion_reason: ExclusionReason | null;
      review_note: string | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
    }>();

  if (error || !data) {
    throw new Error(`Falha ao salvar revisão da transação: ${error?.message ?? "sem retorno do banco"}`);
  }

  await insertAuditLog({
    apuracaoId: transaction.apuracao_id,
    actorUserId: params.actorUserId,
    entityId: data.id,
    action: existing ? "review.updated" : "review.created",
    payload: {
      before: existing ?? null,
      after: data,
    },
  });

  const review: TransactionReviewRecord = {
    id: data.id,
    transactionId: data.transaction_id,
    decision: data.decision,
    exclusionReason: data.exclusion_reason,
    reviewNote: data.review_note,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return {
    apuracaoId: transaction.apuracao_id,
    review,
  };
}

export async function batchUpsertTransactionReviews(params: {
  actorUserId: string;
  transactionIds: string[];
  decision: ReviewDecision;
  exclusionReason?: ExclusionReason | null;
  reviewNote?: string | null;
}) {
  const results: Array<{
    apuracaoId: string;
    review: TransactionReviewRecord;
  }> = [];

  for (const transactionId of params.transactionIds) {
    const result = await upsertTransactionReview({
      actorUserId: params.actorUserId,
      payload: {
        transactionId,
        decision: params.decision,
        exclusionReason: params.exclusionReason,
        reviewNote: params.reviewNote,
      },
    });

    results.push(result);
  }

  return results;
}

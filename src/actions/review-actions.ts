"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedUser, requireRole } from "@/lib/auth/guards";
import { appRouteBuilders } from "@/lib/constants/routes";
import { batchUpsertTransactionReviews, upsertTransactionReview } from "@/lib/reviews/mutations";
import {
  batchTransactionReviewSchema,
  updateTransactionReviewSchema,
} from "@/lib/validations/review";
import type { FormState } from "@/types/forms";

export async function updateTransactionReviewAction(input: unknown) {
  const user = await requireAuthenticatedUser();
  await requireRole("user");

  const parsed = updateTransactionReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Dados inválidos para salvar a revisão.",
    } satisfies FormState;
  }

  const result = await upsertTransactionReview({
    actorUserId: user.id,
    payload: parsed.data,
  });

  revalidatePath(appRouteBuilders.apuracao(result.apuracaoId));
  revalidatePath(appRouteBuilders.apuracaoReview(result.apuracaoId));

  return {
    success: "Revisão salva com sucesso.",
    review: result.review,
    apuracaoId: result.apuracaoId,
  };
}

export async function batchTransactionReviewAction(input: unknown) {
  const user = await requireAuthenticatedUser();
  await requireRole("user");

  const parsed = batchTransactionReviewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Dados inválidos para a ação em lote.",
    } satisfies FormState;
  }

  const results = await batchUpsertTransactionReviews({
    actorUserId: user.id,
    transactionIds: parsed.data.transactionIds,
    decision: parsed.data.decision,
    exclusionReason: parsed.data.exclusionReason,
    reviewNote: parsed.data.reviewNote,
  });

  const apuracaoIds = new Set(results.map((result) => result.apuracaoId));

  apuracaoIds.forEach((apuracaoId) => {
    revalidatePath(appRouteBuilders.apuracao(apuracaoId));
    revalidatePath(appRouteBuilders.apuracaoReview(apuracaoId));
  });

  return {
    success: "Ação em lote aplicada com sucesso.",
  };
}

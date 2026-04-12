import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getAuthenticatedUserContext } from "@/lib/auth/queries";
import { appRouteBuilders } from "@/lib/constants/routes";
import { batchUpsertTransactionReviews, upsertTransactionReview } from "@/lib/reviews/mutations";
import {
  batchTransactionReviewSchema,
  updateTransactionReviewSchema,
} from "@/lib/validations/review";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: apuracaoId } = await params;
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (!user.isActive || user.role !== "user") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateTransactionReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido para revisão." },
      { status: 400 },
    );
  }

  const result = await upsertTransactionReview({
    actorUserId: user.id,
    payload: parsed.data,
  });

  revalidatePath(appRouteBuilders.apuracao(apuracaoId));
  revalidatePath(appRouteBuilders.apuracaoReview(apuracaoId));

  return NextResponse.json({
    success: true,
    review: result.review,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: apuracaoId } = await params;
  const user = await getAuthenticatedUserContext();

  if (!user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (!user.isActive || user.role !== "user") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = batchTransactionReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido para ação em lote." },
      { status: 400 },
    );
  }

  await batchUpsertTransactionReviews({
    actorUserId: user.id,
    transactionIds: parsed.data.transactionIds,
    decision: parsed.data.decision,
    exclusionReason: parsed.data.exclusionReason,
    reviewNote: parsed.data.reviewNote,
  });

  revalidatePath(appRouteBuilders.apuracao(apuracaoId));
  revalidatePath(appRouteBuilders.apuracaoReview(apuracaoId));

  return NextResponse.json({
    success: true,
  });
}

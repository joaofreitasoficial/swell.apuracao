import { z } from "zod";

import { exclusionReasons, reviewDecisions } from "@/types/domain";

export const reviewDecisionSchema = z.enum(reviewDecisions);
export const exclusionReasonSchema = z.enum(exclusionReasons);

export const updateTransactionReviewSchema = z.object({
  transactionId: z.string().uuid(),
  decision: reviewDecisionSchema,
  exclusionReason: exclusionReasonSchema.nullable().optional(),
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const batchTransactionReviewSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1),
  decision: reviewDecisionSchema,
  exclusionReason: exclusionReasonSchema.nullable().optional(),
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const undoTransactionReviewSchema = z.object({
  transactionId: z.string().uuid(),
  previousDecision: reviewDecisionSchema,
  previousExclusionReason: exclusionReasonSchema.nullable().optional(),
  previousReviewNote: z.string().trim().max(1000).nullable().optional(),
});

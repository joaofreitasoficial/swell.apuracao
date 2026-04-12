import { z } from "zod";

export const extractedTransactionSchema = z.object({
  transactionDate: z.string().min(10),
  description: z.string().min(1),
  amount: z.number().positive(),
  direction: z.enum(["credit", "debit"]),
  extractionConfidence: z.number().min(0).max(1),
  originalText: z.string().min(1),
});

export const extractedTransactionsPayloadSchema = z.object({
  transactions: z.array(extractedTransactionSchema),
});

export type ExtractedTransactionsPayload = z.infer<
  typeof extractedTransactionsPayloadSchema
>;

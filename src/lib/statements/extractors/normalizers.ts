import { createHash } from "node:crypto";

import type { ExtractedTransactionCandidate } from "@/lib/statements/extractors/types";

function normalizeDescription(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTransactionHash(params: {
  apuracaoId: string;
  bankName: string | null;
  accountLabel: string | null;
  candidate: ExtractedTransactionCandidate;
}) {
  const payload = [
    params.apuracaoId,
    params.bankName ?? "",
    params.accountLabel ?? "",
    params.candidate.transactionDate,
    params.candidate.direction,
    params.candidate.amount.toFixed(2),
    normalizeDescription(params.candidate.description),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

export function normalizeTransactions(
  transactions: ExtractedTransactionCandidate[],
) {
  return transactions
    .filter(
      (candidate) =>
        candidate.transactionDate &&
        candidate.description.trim() &&
        candidate.amount > 0,
    )
    .map((candidate) => ({
      ...candidate,
      description: candidate.description.trim(),
      originalText: candidate.originalText.trim(),
      extractionConfidence: Number(candidate.extractionConfidence.toFixed(2)),
    }));
}

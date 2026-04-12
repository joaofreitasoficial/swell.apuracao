export type TransactionDirection = "credit" | "debit";

export type ExtractedTransactionCandidate = {
  transactionDate: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  extractionConfidence: number;
  originalText: string;
};

export type StatementExtractionContext = {
  statementFileId: string;
  apuracaoId: string;
  text: string;
  bankName: string | null;
  accountLabel: string | null;
};

export type StatementExtractionAdapterResult = {
  adapterName: string;
  modelName?: string | null;
  transactions: ExtractedTransactionCandidate[];
  rawOutput?: unknown;
};

export interface StatementExtractionAdapter {
  name: string;
  isAvailable(): boolean;
  supports(context: StatementExtractionContext): boolean;
  extract(
    context: StatementExtractionContext,
  ): Promise<StatementExtractionAdapterResult>;
}

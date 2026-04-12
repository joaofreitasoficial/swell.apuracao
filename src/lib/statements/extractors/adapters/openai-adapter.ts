import OpenAI from "openai";

import { getServerEnv } from "@/lib/env";
import { extractedTransactionsPayloadSchema } from "@/lib/statements/extractors/schema";
import type {
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
} from "@/lib/statements/extractors/types";

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          transactionDate: { type: "string" },
          description: { type: "string" },
          amount: { type: "number" },
          direction: { type: "string", enum: ["credit", "debit"] },
          extractionConfidence: { type: "number" },
          originalText: { type: "string" },
        },
        required: [
          "transactionDate",
          "description",
          "amount",
          "direction",
          "extractionConfidence",
          "originalText",
        ],
      },
    },
  },
  required: ["transactions"],
} as const;

export class OpenAiExtractionAdapter implements StatementExtractionAdapter {
  name = "openai";

  private getClient() {
    const env = getServerEnv();

    if (!env.OPENAI_API_KEY) {
      return null;
    }

    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  isAvailable() {
    return Boolean(this.getClient());
  }

  supports(context: StatementExtractionContext) {
    return context.text.trim().length > 0;
  }

  async extract(
    context: StatementExtractionContext,
  ): Promise<StatementExtractionAdapterResult> {
    const client = this.getClient();

    if (!client) {
      throw new Error("OPENAI_API_KEY não configurada para extração IA.");
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Extraia movimentacoes bancarias de extratos em PDF. Estruture apenas transacoes observadas no texto, preservando a descricao original. Use YYYY-MM-DD. Nunca invente linhas. extractionConfidence deve ficar entre 0 e 1.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Banco detectado: ${context.bankName ?? "desconhecido"}`,
                `Conta detectada: ${context.accountLabel ?? "desconhecida"}`,
                "Texto bruto do extrato:",
                context.text.slice(0, 120000),
              ].join("\n\n"),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "statement_transactions",
          schema: jsonSchema,
          strict: true,
        },
      },
    });

    const parsedPayload = extractedTransactionsPayloadSchema.parse(
      JSON.parse(response.output_text),
    );

    return {
      adapterName: this.name,
      modelName: response.model,
      transactions: parsedPayload.transactions,
      rawOutput: parsedPayload,
    };
  }
}

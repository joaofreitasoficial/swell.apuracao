import { GoogleGenAI, Type } from "@google/genai";

import { getServerEnv } from "@/lib/env";
import { extractedTransactionsPayloadSchema } from "@/lib/statements/extractors/schema";
import type {
  StatementExtractionAdapter,
  StatementExtractionAdapterResult,
  StatementExtractionContext,
} from "@/lib/statements/extractors/types";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          transactionDate: { type: Type.STRING },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          direction: { type: Type.STRING, enum: ["credit", "debit"] },
          extractionConfidence: { type: Type.NUMBER },
          originalText: { type: Type.STRING },
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
};

const SYSTEM_INSTRUCTION = `Você extrai movimentações bancárias de extratos em PDF.
Regras:
- Estruture apenas transações que aparecem no texto, preservando a descrição original.
- Use datas no formato YYYY-MM-DD.
- Não invente linhas nem somas.
- O campo extractionConfidence deve ficar entre 0 e 1.
- direction: "credit" para entradas (recebido, entrada, crédito, depósito); "debit" para saídas (enviado, pagamento, compra, débito, tarifa).
- amount: sempre positivo, o sinal é indicado por direction.
- Não inclua saldos, totais, rodapés ou mensagens de atendimento como transações.`;

export class GeminiExtractionAdapter implements StatementExtractionAdapter {
  name = "gemini";

  private async generateWithRetry(
    client: GoogleGenAI,
    prompt: string,
    attempt = 1,
  ): Promise<string> {
    const maxAttempts = 3;

    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
        },
      });

      const rawText = response.text;

      if (!rawText) {
        throw new Error("Gemini retornou resposta vazia.");
      }

      return rawText;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransient =
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (isTransient && attempt < maxAttempts) {
        const delayMs = 1000 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.generateWithRetry(client, prompt, attempt + 1);
      }

      throw error;
    }
  }

  private getClient() {
    const env = getServerEnv();

    if (!env.GEMINI_API_KEY) {
      return null;
    }

    return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
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
      throw new Error("GEMINI_API_KEY não configurada para extração IA.");
    }

    const prompt = [
      `Banco detectado: ${context.bankName ?? "desconhecido"}`,
      `Conta detectada: ${context.accountLabel ?? "desconhecida"}`,
      "Texto bruto do extrato:",
      context.text.slice(0, 120000),
    ].join("\n\n");

    const rawText = await this.generateWithRetry(client, prompt);

    if (!rawText) {
      throw new Error("Gemini retornou resposta vazia.");
    }

    const parsedPayload = extractedTransactionsPayloadSchema.parse(
      JSON.parse(rawText),
    );

    return {
      adapterName: this.name,
      modelName: "gemini-2.5-flash",
      transactions: parsedPayload.transactions,
      rawOutput: parsedPayload,
    };
  }
}

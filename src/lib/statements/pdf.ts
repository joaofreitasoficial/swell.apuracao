import "server-only";

import { createRequire } from "node:module";

import { extractTextWithOcrFromImages } from "@/lib/statements/ocr";

type PdfExtractionResult = {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
};

type PdfParseFn = (
  dataBuffer: Buffer | Uint8Array,
  options?: Record<string, unknown>,
) => Promise<{
  numpages?: number;
  numrender?: number;
  info?: Record<string, unknown>;
  metadata?: unknown;
  text?: string;
  version?: string;
}>;

const require = createRequire(import.meta.url);

let pdfParseFn: PdfParseFn | null = null;

function getPdfParseFn(): PdfParseFn {
  if (pdfParseFn) {
    return pdfParseFn;
  }

  // pdf-parse@1.x runs its test-file loader on require, which fails in
  // serverless/bundler contexts. Requiring the implementation module directly
  // skips that behavior. The lib entrypoint returns a callable function.
  const mod = require("pdf-parse/lib/pdf-parse.js") as
    | PdfParseFn
    | { default: PdfParseFn };

  pdfParseFn = typeof mod === "function" ? mod : mod.default;

  if (typeof pdfParseFn !== "function") {
    throw new Error("Falha ao carregar o parser de PDF no ambiente atual.");
  }

  return pdfParseFn;
}

export async function extractPdfData(fileBuffer: Buffer): Promise<PdfExtractionResult> {
  const pdfParse = getPdfParseFn();

  try {
    const parsed = await pdfParse(fileBuffer);
    const text = (parsed.text ?? "").trim();
    const pageCount = Number(parsed.numpages ?? 0) || 0;

    if (text.length >= 50) {
      return {
        text,
        pageCount,
        ocrUsed: false,
      };
    }

    // Fallback OCR only if pdf-parse returned virtually nothing.
    try {
      const ocrText = await extractTextWithOcrFromImages([]);
      return {
        text: ocrText || text,
        pageCount,
        ocrUsed: true,
      };
    } catch (ocrError) {
      if (text.length > 0) {
        return {
          text,
          pageCount,
          ocrUsed: false,
        };
      }

      throw new Error(
        `Falha ao executar OCR no PDF. O ambiente atual nao conseguiu renderizar paginas para OCR (${ocrError instanceof Error ? ocrError.message : "erro desconhecido"}).`,
      );
    }
  } catch (error) {
    throw new Error(
      `Falha ao extrair texto do PDF: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    );
  }
}

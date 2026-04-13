import "server-only";

import { createRequire } from "node:module";

import { extractTextWithOcrFromImages } from "@/lib/statements/ocr";

type PdfExtractionResult = {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
};

type PdfParseInstance = {
  destroy(): Promise<void>;
  getInfo(args?: { parsePageInfo?: boolean }): Promise<{ total?: number }>;
  getText(): Promise<{ text?: string }>;
  getScreenshot(args: {
    first: number;
    scale: number;
    imageDataUrl: false;
    imageBuffer: true;
  }): Promise<{
    pages?: Array<{ data?: Buffer | Uint8Array | ArrayBuffer | null }>;
  }>;
};

type PdfParseConstructor = new (args: { data: Buffer | Uint8Array }) => PdfParseInstance;

const require = createRequire(import.meta.url);

let pdfParseConstructor: PdfParseConstructor | null = null;

function getPdfParseConstructor(): PdfParseConstructor {
  if (pdfParseConstructor) {
    return pdfParseConstructor;
  }

  const requiredModule = require("pdf-parse") as {
    PDFParse?: PdfParseConstructor;
  };

  if (!requiredModule.PDFParse) {
    throw new Error(
      "Falha ao carregar o parser de PDF no ambiente atual.",
    );
  }

  pdfParseConstructor = requiredModule.PDFParse;

  return pdfParseConstructor;
}

export async function extractPdfData(fileBuffer: Buffer): Promise<PdfExtractionResult> {
  const PDFParse = getPdfParseConstructor();
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const [infoResult, textResult] = await Promise.all([
      parser.getInfo({ parsePageInfo: true }),
      parser.getText(),
    ]);

    const pageCount = Number(infoResult.total ?? 0) || 0;
    const text = textResult.text?.trim() ?? "";

    if (text.length >= 50) {
      return {
        text,
        pageCount,
        ocrUsed: false,
      };
    }

    try {
      const screenshots = await parser.getScreenshot({
        first: Math.min(Math.max(pageCount, 1), 2),
        scale: 1.4,
        imageDataUrl: false,
        imageBuffer: true,
      });

      const ocrText = await extractTextWithOcrFromImages(
        ((screenshots as {
          pages?: Array<{ data?: Buffer | Uint8Array | ArrayBuffer | null }>;
        }).pages ?? []),
      );

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
  } finally {
    await parser.destroy();
  }
}

import "server-only";

import { PDFParse } from "pdf-parse";

import { extractTextWithOcrFromImages } from "@/lib/statements/ocr";

type PdfExtractionResult = {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
};

export async function extractPdfData(fileBuffer: Buffer): Promise<PdfExtractionResult> {
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

    const screenshots = await parser.getScreenshot({
      first: Math.min(Math.max(pageCount, 1), 2),
      scale: 1.4,
      imageDataUrl: false,
      imageBuffer: true,
    });

    const ocrText = await extractTextWithOcrFromImages(
      ((screenshots as { pages?: Array<{ data?: Buffer | Uint8Array | ArrayBuffer | null }> })
        .pages ?? []),
    );

    return {
      text: ocrText || text,
      pageCount,
      ocrUsed: true,
    };
  } finally {
    await parser.destroy();
  }
}

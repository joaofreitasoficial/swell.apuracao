import "server-only";

import Tesseract from "tesseract.js";

export async function extractTextWithOcrFromImages(
  pages: Array<{ data?: Buffer | Uint8Array | ArrayBuffer | null }>,
) {
  const results: string[] = [];

  for (const page of pages) {
    if (!page.data) {
      continue;
    }

    const image =
      page.data instanceof ArrayBuffer
        ? Buffer.from(page.data)
        : Buffer.isBuffer(page.data)
          ? page.data
          : Buffer.from(page.data);

    const result = await Tesseract.recognize(image, "por+eng");
    const text = result.data.text?.trim();

    if (text) {
      results.push(text);
    }
  }

  return results.join("\n\n").trim();
}

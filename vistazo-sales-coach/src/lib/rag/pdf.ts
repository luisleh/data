import { extractText, getDocumentProxy } from "unpdf";

/** Extracts plain text from a PDF buffer (serverless-friendly). */
export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/**
 * Text chunking for RAG ingestion. Pure functions → unit-tested.
 */

export interface ChunkOptions {
  /** Target chunk size in characters. */
  chunkSize?: number;
  /** Overlap between consecutive chunks in characters. */
  overlap?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  chunkSize: 1500,
  overlap: 200,
};

/** Collapse whitespace noise typical of PDF extraction. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits text into overlapping chunks, preferring paragraph and
 * sentence boundaries so chunks stay semantically coherent.
 */
export function chunkText(text: string, options?: ChunkOptions): string[] {
  const { chunkSize, overlap } = { ...DEFAULTS, ...options };
  const normalized = normalizeText(text);
  if (!normalized) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      // Prefer to break at a paragraph, then sentence, then space.
      const window = normalized.slice(start, end);
      const paragraphBreak = window.lastIndexOf("\n\n");
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf(".\n"),
      );
      const spaceBreak = window.lastIndexOf(" ");

      const minBreak = Math.floor(chunkSize * 0.5);
      if (paragraphBreak > minBreak) end = start + paragraphBreak;
      else if (sentenceBreak > minBreak) end = start + sentenceBreak + 1;
      else if (spaceBreak > minBreak) end = start + spaceBreak;
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

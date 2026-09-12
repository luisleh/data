import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai";
import { logger } from "@/lib/logger";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  similarity: number;
  documentTitle: string;
  documentProduct: string | null;
  documentVersion: string | null;
  documentSource: string | null;
}

const DEFAULT_MATCH_COUNT = 6;
/** Below this similarity we treat the library as having no evidence. */
export const MIN_SIMILARITY = 0.25;

/**
 * Retrieves the most relevant chunks from ACTIVE, ready documents
 * only (enforced inside the SQL function `match_document_chunks`).
 * Server-side only — uses the service role.
 */
export async function retrieveChunks(
  query: string,
  options?: { matchCount?: number },
): Promise<RetrievedChunk[]> {
  const embedder = getEmbeddingProvider();
  const embedding = await embedder.embedOne(query);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: options?.matchCount ?? DEFAULT_MATCH_COUNT,
    min_similarity: MIN_SIMILARITY,
  });

  if (error) {
    logger.error("rag: retrieval failed", { error: error.message });
    return [];
  }

  type Row = {
    chunk_id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    similarity: number;
    document_title: string;
    document_product: string | null;
    document_version: string | null;
    document_source: string | null;
  };

  return ((data ?? []) as Row[]).map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    content: row.content,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    documentTitle: row.document_title,
    documentProduct: row.document_product,
    documentVersion: row.document_version,
    documentSource: row.document_source,
  }));
}

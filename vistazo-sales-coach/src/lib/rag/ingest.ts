import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { chunkText } from "./chunk";
import { extractPdfText } from "./pdf";

const EMBED_BATCH_SIZE = 64;

/**
 * Ingests an uploaded PDF into the RAG index:
 * extract text → chunk → embed → store chunks.
 * Marks the document `ready` or `error` when done. Runs after the
 * file is already in Storage and the metadata row exists.
 */
export async function ingestDocument(documentId: string, storagePath: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("knowledge")
      .download(storagePath);
    if (downloadError || !file) {
      throw new Error(`No se pudo descargar el archivo: ${downloadError?.message}`);
    }

    const text = await extractPdfText(await file.arrayBuffer());
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("El PDF no contiene texto extraíble (¿es un escaneo sin OCR?)");
    }

    const embedder = getEmbeddingProvider();
    const rows: {
      document_id: string;
      chunk_index: number;
      content: string;
      embedding: number[];
    }[] = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedder.embed(batch);
      batch.forEach((content, j) => {
        rows.push({
          document_id: documentId,
          chunk_index: i + j,
          content,
          embedding: embeddings[j],
        });
      });
    }

    // Replace any previous chunks (supports re-ingestion).
    await supabase.from("document_chunks").delete().eq("document_id", documentId);
    const { error: insertError } = await supabase.from("document_chunks").insert(rows);
    if (insertError) throw new Error(`Error insertando chunks: ${insertError.message}`);

    await supabase
      .from("knowledge_documents")
      .update({ status: "ready", status_detail: null, chunk_count: rows.length })
      .eq("id", documentId);

    logger.info("rag: document ingested", { documentId, chunks: rows.length });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error("rag: ingestion failed", { documentId, detail });
    await supabase
      .from("knowledge_documents")
      .update({ status: "error", status_detail: detail })
      .eq("id", documentId);
  }
}

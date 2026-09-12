import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachMode } from "@/lib/coach/modes";
import type { GuardrailCategory } from "@/lib/ai/types";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

/**
 * Conversation persistence. All functions take a request-scoped
 * Supabase client (RLS applies: a seller can only touch their own
 * rows), so this layer never widens access.
 */

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  input_type: "text" | "voice";
  mode: string;
  created_at: string;
}

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null,
  mode: CoachMode,
  firstMessage?: string,
): Promise<{ id: string } | null> {
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();
    return data ? { id: data.id } : null;
  }

  const title = firstMessage
    ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "")
    : "Nueva conversación";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title, mode })
    .select("id")
    .single();

  return error ? null : { id: data.id };
}

export async function saveMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    inputType: "text" | "voice";
    mode: CoachMode;
    guardrailCategory?: GuardrailCategory;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      input_type: input.inputType,
      mode: input.mode,
      guardrail_category: input.guardrailCategory ?? null,
    })
    .select("id")
    .single();

  if (!error) {
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.conversationId);
  }

  return error ? null : data.id;
}

/**
 * RAG citations are written with the service-role client (the
 * chunks table is server-only), but only after the message was
 * created through the RLS-scoped client above.
 */
export async function saveMessageSources(
  adminSupabase: SupabaseClient,
  messageId: string,
  chunks: RetrievedChunk[],
): Promise<void> {
  if (chunks.length === 0) return;

  // One citation per document (best similarity), so the UI shows
  // clean, deduplicated sources.
  const byDocument = new Map<string, RetrievedChunk>();
  for (const chunk of chunks) {
    const existing = byDocument.get(chunk.documentId);
    if (!existing || chunk.similarity > existing.similarity) {
      byDocument.set(chunk.documentId, chunk);
    }
  }

  await adminSupabase.from("message_sources").insert(
    [...byDocument.values()].map((chunk) => ({
      message_id: messageId,
      document_id: chunk.documentId,
      chunk_id: chunk.chunkId,
      document_title: chunk.documentTitle,
      similarity: chunk.similarity,
    })),
  );
}

export async function getRecentMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 30,
): Promise<StoredMessage[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, role, content, input_type, mode, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as StoredMessage[]).reverse();
}

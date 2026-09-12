import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateConversation, saveMessage } from "@/lib/conversations";
import { isCoachMode, type CoachMode } from "@/lib/coach/modes";

const requestSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.string().default("general"),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(16000),
  sources: z
    .array(
      z.object({
        documentId: z.string().uuid(),
        chunkId: z.string().uuid().nullable().optional(),
        title: z.string(),
        similarity: z.number().nullable().optional(),
      }),
    )
    .optional(),
});

/**
 * Persists voice-session transcripts into the same conversation
 * as the text chat (input_type = 'voice'), so both channels share
 * one history. RLS guarantees the conversation belongs to the caller.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

  const mode: CoachMode = isCoachMode(parsed.data.mode) ? parsed.data.mode : "general";
  const supabase = await createSupabaseServerClient();

  const conversation = await getOrCreateConversation(
    supabase,
    user.id,
    parsed.data.conversationId ?? null,
    mode,
    parsed.data.content,
  );
  if (!conversation) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const messageId = await saveMessage(supabase, {
    conversationId: conversation.id,
    role: parsed.data.role,
    content: parsed.data.content,
    inputType: "voice",
    mode,
  });

  if (messageId && parsed.data.sources?.length) {
    const admin = createAdminClient();
    await admin.from("message_sources").insert(
      parsed.data.sources.map((s) => ({
        message_id: messageId,
        document_id: s.documentId,
        chunk_id: s.chunkId ?? null,
        document_title: s.title,
        similarity: s.similarity ?? null,
      })),
    );
  }

  return Response.json({ conversationId: conversation.id, messageId });
}

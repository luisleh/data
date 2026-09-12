import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paramsSchema = z.string().uuid();

/** Returns one conversation's messages + RAG sources (own rows only, via RLS). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  if (!paramsSchema.safeParse(id).success) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title, mode")
    .eq("id", id)
    .single();
  if (!conversation) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, input_type, mode, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: sources } = messageIds.length
    ? await supabase
        .from("message_sources")
        .select("message_id, document_id, document_title, similarity")
        .in("message_id", messageIds)
    : { data: [] };

  return Response.json({ conversation, messages: messages ?? [], sources: sources ?? [] });
}

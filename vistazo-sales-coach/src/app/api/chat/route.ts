import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatProvider, getGuardrailClassifier } from "@/lib/ai";
import { classifyMessage, outOfScopeReply } from "@/lib/guardrail";
import { mentionsProductFacts } from "@/lib/guardrail/heuristics";
import { retrieveChunks, type RetrievedChunk } from "@/lib/rag/retrieve";
import { buildSystemPrompt } from "@/lib/coach/prompts";
import { isCoachMode, type CoachMode } from "@/lib/coach/modes";
import { getCurrentGuidelines } from "@/lib/guidelines";
import {
  getOrCreateConversation,
  getRecentMessages,
  saveMessage,
  saveMessageSources,
} from "@/lib/conversations";
import { logger } from "@/lib/logger";
import type { ChatMessage } from "@/lib/ai/types";

export const maxDuration = 60;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.string().default("general"),
});

/**
 * Main chat endpoint. Streams NDJSON lines:
 *   {type:"meta", conversationId}
 *   {type:"sources", sources:[...]}   (only when RAG was used)
 *   {type:"delta", text}
 *   {type:"done"}
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { message, conversationId: requestedConversationId } = parsed.data;
  const mode: CoachMode = isCoachMode(parsed.data.mode) ? parsed.data.mode : "general";

  const supabase = await createSupabaseServerClient();

  const conversation = await getOrCreateConversation(
    supabase,
    user.id,
    requestedConversationId ?? null,
    mode,
    message,
  );
  if (!conversation) {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const history = await getRecentMessages(supabase, conversation.id);

  // ---- Guardrail: classify BEFORE calling the coach model ----
  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Vendedor" : "Coach"}: ${m.content.slice(0, 300)}`);

  const guardrail = await classifyMessage(message, getGuardrailClassifier(), {
    recentHistory,
  });

  await saveMessage(supabase, {
    conversationId: conversation.id,
    role: "user",
    content: message,
    inputType: "text",
    mode,
    guardrailCategory: guardrail.category,
  });

  logger.info("chat: message classified", {
    userId: user.id,
    conversationId: conversation.id,
    category: guardrail.category,
    decidedBy: guardrail.decidedBy,
    mode,
  });

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, payload: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));

  // ---- Out of scope: fixed redirection, coach model never called ----
  if (guardrail.category === "out_of_scope") {
    const reply = outOfScopeReply();
    await saveMessage(supabase, {
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
      inputType: "text",
      mode,
    });

    const stream = new ReadableStream({
      start(controller) {
        send(controller, { type: "meta", conversationId: conversation.id });
        send(controller, { type: "delta", text: reply });
        send(controller, { type: "done" });
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }

  // ---- Retrieval: product questions always; other categories when
  // the message touches technical/product facts ----
  const isProductQuestion = guardrail.category === "product_question";
  let chunks: RetrievedChunk[] = [];
  if (isProductQuestion || mode === "product" || mentionsProductFacts(message)) {
    try {
      chunks = await retrieveChunks(message);
    } catch (error) {
      logger.error("chat: retrieval error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const guidelines = await getCurrentGuidelines();
  const systemPrompt = buildSystemPrompt({
    guidelines,
    mode,
    chunks,
    isProductQuestion: isProductQuestion || mode === "product",
  });

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map(
      (m): ChatMessage => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }),
    ),
    { role: "user", content: message },
  ];

  const provider = getChatProvider();
  const adminSupabase = createAdminClient();

  const uniqueSources = (() => {
    const byDoc = new Map<string, RetrievedChunk>();
    for (const c of chunks) {
      const prev = byDoc.get(c.documentId);
      if (!prev || c.similarity > prev.similarity) byDoc.set(c.documentId, c);
    }
    return [...byDoc.values()].map((c) => ({
      documentId: c.documentId,
      title: c.documentTitle,
      product: c.documentProduct,
      version: c.documentVersion,
      source: c.documentSource,
      similarity: Math.round(c.similarity * 100) / 100,
    }));
  })();

  const stream = new ReadableStream({
    async start(controller) {
      send(controller, { type: "meta", conversationId: conversation.id });
      if (uniqueSources.length > 0) {
        send(controller, { type: "sources", sources: uniqueSources });
      }

      let fullText = "";
      try {
        for await (const delta of provider.streamChat(chatMessages)) {
          fullText += delta;
          send(controller, { type: "delta", text: delta });
        }
      } catch (error) {
        logger.error("chat: stream error", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!fullText) {
          const fallback =
            "Tuve un problema técnico para generar la respuesta. Probá de nuevo en unos segundos.";
          fullText = fallback;
          send(controller, { type: "delta", text: fallback });
        }
      }

      const messageId = await saveMessage(supabase, {
        conversationId: conversation.id,
        role: "assistant",
        content: fullText,
        inputType: "text",
        mode,
      });
      if (messageId && chunks.length > 0) {
        await saveMessageSources(adminSupabase, messageId, chunks);
      }

      send(controller, { type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

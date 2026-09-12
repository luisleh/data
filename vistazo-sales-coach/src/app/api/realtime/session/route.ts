import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { getCurrentGuidelines } from "@/lib/guidelines";
import { buildVoiceInstructions } from "@/lib/coach/prompts";
import { isCoachMode, type CoachMode } from "@/lib/coach/modes";
import { getRecentMessages } from "@/lib/conversations";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.string().default("general"),
});

/**
 * Mints an EPHEMERAL client secret for an OpenAI Realtime voice
 * session. The real API key never leaves the server; the browser
 * only receives a short-lived token scoped to one session.
 * The session instructions embed the admin guidelines, the mode
 * and the recent chat history so text and voice share context.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

  const mode: CoachMode = isCoachMode(parsed.data.mode) ? parsed.data.mode : "general";
  const conversationId = parsed.data.conversationId ?? null;

  // Recent history (RLS: only the caller's own conversation).
  let historySummary: string | null = null;
  if (conversationId) {
    const supabase = await createSupabaseServerClient();
    const messages = await getRecentMessages(supabase, conversationId, 20);
    if (messages.length > 0) {
      historySummary = messages
        .map((m) => `${m.role === "user" ? "Vendedor" : "Coach"}: ${m.content.slice(0, 500)}`)
        .join("\n");
    }
  }

  const guidelines = await getCurrentGuidelines();
  const instructions = buildVoiceInstructions({ guidelines, mode, historySummary });

  const sessionConfig = {
    session: {
      type: "realtime",
      model: serverEnv.realtimeModel,
      instructions,
      audio: {
        input: {
          transcription: { model: "whisper-1", language: "es" },
        },
        output: { voice: "marin" },
      },
      tools: [
        {
          type: "function",
          name: "search_library",
          description:
            "Busca evidencia en la biblioteca aprobada de Vistazo/GE HealthCare. Llamala SIEMPRE antes de afirmar datos técnicos o de producto.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Consulta en lenguaje natural sobre el producto o tema técnico",
              },
            },
            required: ["query"],
          },
        },
      ],
    },
  };

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionConfig),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error("realtime: client secret mint failed", {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    return Response.json(
      { error: "No se pudo iniciar la sesión de voz" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { value?: string; expires_at?: number };
  if (!data.value) {
    logger.error("realtime: unexpected client secret response");
    return Response.json({ error: "Respuesta inesperada del proveedor" }, { status: 502 });
  }

  return Response.json({
    clientSecret: data.value,
    model: serverEnv.realtimeModel,
    expiresAt: data.expires_at ?? null,
  });
}

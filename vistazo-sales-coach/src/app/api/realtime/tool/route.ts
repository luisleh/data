import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { NO_EVIDENCE_REPLY } from "@/lib/guardrail";

const requestSchema = z.object({
  tool: z.literal("search_library"),
  query: z.string().trim().min(1).max(1000),
});

/**
 * Server-side relay for realtime tool calls: the voice model asks
 * for `search_library`, the browser forwards it here, and the RAG
 * search runs on the server (active documents only, service role
 * never exposed).
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });

  const chunks = await retrieveChunks(parsed.data.query, { matchCount: 4 });

  if (chunks.length === 0) {
    return Response.json({
      result: { found: false, message: NO_EVIDENCE_REPLY, excerpts: [] },
      sources: [],
    });
  }

  return Response.json({
    result: {
      found: true,
      excerpts: chunks.map((c) => ({
        document: c.documentTitle,
        version: c.documentVersion,
        product: c.documentProduct,
        content: c.content.slice(0, 1200),
      })),
    },
    sources: chunks.map((c) => ({
      documentId: c.documentId,
      chunkId: c.chunkId,
      title: c.documentTitle,
      similarity: Math.round(c.similarity * 100) / 100,
    })),
  });
}

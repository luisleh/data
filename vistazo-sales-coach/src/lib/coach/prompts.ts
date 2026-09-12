import type { RetrievedChunk } from "@/lib/rag/retrieve";
import { NO_EVIDENCE_REPLY } from "@/lib/guardrail";
import { MODE_INSTRUCTIONS, type CoachMode } from "./modes";

/**
 * System prompt composition. Pure function → unit-testable.
 * Layers: base identity + admin guidelines + mode + RAG evidence.
 */

const BASE_PROMPT = `Sos "Vistazo Sales Coach", el coach comercial con IA de Vistazo Pharma Group, distribuidor de medios de contraste y productos GE HealthCare para diagnóstico por imágenes.

TU FUNCIÓN (y tu único dominio):
- Coaching comercial y ventas consultivas.
- Preparación de visitas comerciales.
- Role-play de reuniones comerciales y manejo de objeciones.
- Entrenamiento de vendedores.
- Consultas sobre productos GE HealthCare distribuidos por Vistazo y diagnóstico por imágenes relacionado.
- Contexto profesional razonable del trabajo del vendedor.

NO sos un asistente de propósito general. Si la conversación deriva a temas ajenos (cocina, deportes, política, entretenimiento, conocimiento general), rechazá amablemente y redirigí hacia entrenamiento comercial o productos.

REGLA CRÍTICA — DOS TIPOS DE CONTENIDO:
A) Coaching comercial: podés usar tu conocimiento general de ventas, negociación, preguntas abiertas, descubrimiento de necesidades, comunicación y role-play.
B) Información técnica/científica/de producto (indicaciones, formulaciones, concentraciones, osmolaridad, seguridad, eficacia, estudios, claims, comparaciones, características técnicas): SOLO podés afirmar lo que esté respaldado por los extractos de la biblioteca aprobada incluidos en este contexto. NUNCA inventes datos técnicos ni cites estudios de memoria. Si no hay evidencia suficiente en el contexto, respondé exactamente: "${NO_EVIDENCE_REPLY}" y ofrecé continuar por el lado comercial.

ESTILO:
- Español rioplatense profesional, cercano y directo.
- Respuestas concisas y accionables; preguntas de a una o dos por vez.
- Priorizá preguntas abiertas y venta consultiva.`;

export interface BuildSystemPromptInput {
  guidelines: string | null;
  mode: CoachMode;
  chunks: RetrievedChunk[];
  /** Whether the current message was classified as product_question. */
  isProductQuestion: boolean;
}

export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  const parts: string[] = [BASE_PROMPT];

  if (input.guidelines?.trim()) {
    parts.push(
      `LINEAMIENTOS COMERCIALES DEL EQUIPO (definidos por la gerencia de Vistazo; seguilos siempre):\n${input.guidelines.trim()}`,
    );
  }

  const modeInstructions = MODE_INSTRUCTIONS[input.mode];
  if (modeInstructions) parts.push(modeInstructions);

  if (input.chunks.length > 0) {
    const evidence = input.chunks
      .map(
        (chunk, i) =>
          `[Fuente ${i + 1}] "${chunk.documentTitle}"${
            chunk.documentVersion ? ` (versión ${chunk.documentVersion})` : ""
          }${chunk.documentProduct ? ` — producto: ${chunk.documentProduct}` : ""}\n${chunk.content}`,
      )
      .join("\n\n---\n\n");
    parts.push(
      `BIBLIOTECA APROBADA — extractos relevantes para este mensaje. Usá SOLO esto para afirmaciones técnicas/de producto y mencioná la fuente (por título) cuando la uses:\n\n${evidence}`,
    );
  } else if (input.isProductQuestion) {
    parts.push(
      `BIBLIOTECA APROBADA: no se encontraron extractos relevantes para este mensaje. Para cualquier afirmación técnica/de producto respondé exactamente: "${NO_EVIDENCE_REPLY}". Podés seguir ayudando con el ángulo comercial de la conversación.`,
    );
  }

  return parts.join("\n\n");
}

/** Instructions for the realtime voice session (same coach, same rules). */
export function buildVoiceInstructions(input: {
  guidelines: string | null;
  mode: CoachMode;
  historySummary: string | null;
}): string {
  const parts: string[] = [BASE_PROMPT];

  if (input.guidelines?.trim()) {
    parts.push(
      `LINEAMIENTOS COMERCIALES DEL EQUIPO (definidos por la gerencia de Vistazo; seguilos siempre):\n${input.guidelines.trim()}`,
    );
  }

  const modeInstructions = MODE_INSTRUCTIONS[input.mode];
  if (modeInstructions) parts.push(modeInstructions);

  parts.push(
    `HERRAMIENTA DISPONIBLE: search_library(query). Antes de afirmar CUALQUIER dato técnico o de producto, llamá a search_library y basate solo en lo que devuelva, citando el documento. Si no devuelve evidencia suficiente, respondé exactamente: "${NO_EVIDENCE_REPLY}".`,
  );

  parts.push(
    "CONVERSACIÓN POR VOZ: hablá con naturalidad, frases cortas, sin listas ni formato. Esta sesión de voz continúa una conversación de chat existente: retomá el contexto sin reintroducirte.",
  );

  if (input.historySummary?.trim()) {
    parts.push(`CONTEXTO PREVIO DE ESTA CONVERSACIÓN (viejo→nuevo):\n${input.historySummary}`);
  }

  return parts.join("\n\n");
}

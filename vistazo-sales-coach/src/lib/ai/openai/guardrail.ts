import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  GUARDRAIL_CATEGORIES,
  type GuardrailCategory,
  type GuardrailClassifier,
} from "@/lib/ai/types";
import { getOpenAI } from "./client";

const CLASSIFIER_SYSTEM_PROMPT = `Eres un clasificador de mensajes para "Vistazo Sales Coach", un coach comercial con IA para vendedores de Vistazo Pharma Group (distribuidor de medios de contraste y productos GE HealthCare para diagnóstico por imágenes).

Clasifica el ÚLTIMO mensaje del usuario en exactamente una categoría:

- "commercial_coaching": ventas, negociación, preparación de visitas, role-play, manejo de objeciones, comunicación comercial, entrenamiento de vendedores, o la continuación natural de una práctica/role-play en curso.
- "product_question": preguntas sobre productos GE HealthCare o de la competencia, medios de contraste, indicaciones, seguridad, eficacia, estudios, fichas técnicas, comparaciones, o diagnóstico por imágenes relacionado con esos productos.
- "professional_context": contexto profesional razonable del trabajo del vendedor (clientes, hospitales, agenda de visitas, territorio, mercado de diagnóstico por imágenes) que no es directamente coaching ni pregunta de producto.
- "out_of_scope": cualquier otra cosa (recetas de cocina, deportes, política, entretenimiento, tareas escolares, programación, conocimiento general sin relación con la función comercial).

Considera el historial reciente: dentro de un role-play, frases sueltas ("es muy caro", "no me interesa") pertenecen a la práctica en curso, no son out_of_scope.

Responde SOLO con JSON: {"category": "<categoria>"}`;

/**
 * LLM-backed classifier. On API failure it fails CLOSED to
 * "professional_context": the coach responds, but constrained by
 * the domain system prompt (never with general-purpose answers).
 */
export class OpenAIGuardrailClassifier implements GuardrailClassifier {
  constructor(private model: string = serverEnv.guardrailModel) {}

  async classify(input: {
    message: string;
    recentHistory?: string[];
  }): Promise<GuardrailCategory> {
    try {
      const historyBlock = input.recentHistory?.length
        ? `Historial reciente (viejo→nuevo):\n${input.recentHistory.join("\n")}\n\n`
        : "";

      const completion = await getOpenAI().chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
          {
            role: "user",
            content: `${historyBlock}Último mensaje del usuario:\n"""${input.message}"""`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { category?: string };
      if (
        parsed.category &&
        (GUARDRAIL_CATEGORIES as readonly string[]).includes(parsed.category)
      ) {
        return parsed.category as GuardrailCategory;
      }
      logger.warn("guardrail: unexpected classifier output", { raw });
      return "professional_context";
    } catch (error) {
      logger.error("guardrail: classifier call failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return "professional_context";
    }
  }
}

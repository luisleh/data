import type { GuardrailCategory, GuardrailClassifier } from "@/lib/ai/types";
import { heuristicClassify } from "./heuristics";

export interface GuardrailResult {
  category: GuardrailCategory;
  /** Which stage decided: cheap heuristics or the LLM classifier. */
  decidedBy: "heuristic" | "llm";
}

/**
 * Explicit, testable guardrail layer. Classification happens
 * BEFORE the coach model is called; `out_of_scope` messages never
 * reach it. The LLM classifier is injected so tests can mock it.
 */
export async function classifyMessage(
  message: string,
  classifier: GuardrailClassifier,
  options?: { recentHistory?: string[] },
): Promise<GuardrailResult> {
  const heuristic = heuristicClassify(message);
  if (heuristic !== null) {
    return { category: heuristic, decidedBy: "heuristic" };
  }
  const category = await classifier.classify({
    message,
    recentHistory: options?.recentHistory,
  });
  return { category, decidedBy: "llm" };
}

/** Fixed, on-brand redirection for out-of-scope messages. */
export function outOfScopeReply(): string {
  return (
    "Ese tema queda fuera de mi función. Soy tu coach comercial de Vistazo. " +
    "Podemos seguir con una preparación de visita, practicar una objeción o " +
    "revisar alguna consulta de producto."
  );
}

export const NO_EVIDENCE_REPLY =
  "No encuentro información suficiente en la biblioteca aprobada para respaldar esa respuesta.";

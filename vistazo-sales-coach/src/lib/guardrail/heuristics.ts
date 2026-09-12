import type { GuardrailCategory } from "@/lib/ai/types";

/**
 * Deterministic pre-classifier. Pure function → unit-testable
 * without network. Returns a category when confident, or null to
 * defer to the LLM classifier.
 *
 * Design: heuristics only short-circuit CLEAR in-domain signals
 * (cheap fast path). Out-of-scope detection is left to the LLM,
 * because keyword blocklists produce false positives ("¿cómo le
 * gano a la competencia?" contains "gano"). The one exception is
 * a small list of unambiguous out-of-scope patterns used as a
 * safety net when the LLM is unavailable.
 */

const IN_DOMAIN_PATTERNS: RegExp[] = [
  // Coaching / sales craft
  /\bobjeci(ón|on|ones)\b/i,
  /\brole[\s-]?play\b/i,
  /\bvisita(s)?\b/i,
  /\bventa(s)?\b/i,
  /\bvend(er|edor|edores)\b/i,
  /\bnegociaci(ón|on)\b/i,
  /\bcliente(s)?\b/i,
  /\bprospecto(s)?\b/i,
  /\breuni(ón|on|ones)\b/i,
  /\bpropuesta\b/i,
  /\bprecio(s)?\b/i,
  /\bdescuento(s)?\b/i,
  /\blicitaci(ón|on|ones)\b/i,
  /\bcompetencia\b/i,
  /\bfeedback\b/i,
  /\bpitch\b/i,
  /\bspeech\b/i,
  // Product / imaging domain
  /\bcontraste(s)?\b/i,
  /\bomnipaque\b/i,
  /\bvisipaque\b/i,
  /\bclariscan\b/i,
  /\boptison\b/i,
  /\biohexol\b/i,
  /\biodixanol\b/i,
  /\bgadolinio\b/i,
  /\bge\s?healthcare\b/i,
  /\btomograf(ía|ia)\b/i,
  /\bresonancia\b/i,
  /\bradiolog(ía|ia)\b/i,
  /\bosmolaridad\b/i,
  /\bosmolalidad\b/i,
  /\bnefropat(ía|ia)\b/i,
  /\bficha t(é|e)cnica\b/i,
  /\bindicaci(ón|on|ones)\b/i,
  /\bdiagn(ó|o)stico por im(á|a)genes\b/i,
  /\bhospital(es)?\b/i,
  /\bm(é|e)dico(s)?\b/i,
  /\bsanatorio(s)?\b/i,
];

/** Unambiguous out-of-scope patterns — safety net only. */
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\breceta(s)? de cocina\b/i,
  /\bc(ó|o)mo (hago|preparo|cocino) (el |la |un |una )?(pollo|milanesa|asado|torta|pizza|guiso|arroz)\b/i,
  /\bpartido de (f(ú|u)tbol|tenis|b(á|a)squet)\b/i,
  /\bqui(é|e)n gan(ó|o) (el mundial|la copa|las elecciones)\b/i,
  /\bhor(ó|o)scopo\b/i,
  /\bchiste(s)?\b/i,
  /\bpel(í|i)cula(s)? recomendada(s)?\b/i,
];

export function heuristicClassify(message: string): GuardrailCategory | null {
  const text = message.trim();
  if (!text) return "professional_context";

  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(text)) return "out_of_scope";
  }
  for (const pattern of IN_DOMAIN_PATTERNS) {
    if (pattern.test(text)) return null; // in-domain signal → let the LLM pick the precise category
  }
  return null;
}

/**
 * Detects whether a message likely needs the approved library
 * (factual/technical product content). Used to decide when to
 * run retrieval even in coaching modes.
 */
const PRODUCT_FACT_PATTERNS: RegExp[] = [
  /\bomnipaque\b/i,
  /\bvisipaque\b/i,
  /\bclariscan\b/i,
  /\boptison\b/i,
  /\biohexol\b/i,
  /\biodixanol\b/i,
  /\bgadolinio\b/i,
  /\bosmolaridad\b/i,
  /\bosmolalidad\b/i,
  /\bconcentraci(ón|on|ones)\b/i,
  /\bindicaci(ón|on|ones)\b/i,
  /\bcontraindicaci(ón|on|ones)\b/i,
  /\bseguridad\b/i,
  /\beficacia\b/i,
  /\bestudio(s)?\b/i,
  /\bpaper(s)?\b/i,
  /\bevidencia\b/i,
  /\bficha t(é|e)cnica\b/i,
  /\bdosis\b/i,
  /\breacci(ón|on|ones) adversa(s)?\b/i,
  /\bcomparaci(ón|on)\b/i,
  /\bcontraste(s)?\b/i,
];

export function mentionsProductFacts(message: string): boolean {
  return PRODUCT_FACT_PATTERNS.some((p) => p.test(message));
}

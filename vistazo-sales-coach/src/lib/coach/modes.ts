/** Coaching modes = quick contexts, not separate agents. */

export const COACH_MODES = ["general", "visit_prep", "objections", "roleplay", "product"] as const;
export type CoachMode = (typeof COACH_MODES)[number];

export function isCoachMode(value: string): value is CoachMode {
  return (COACH_MODES as readonly string[]).includes(value);
}

export const MODE_LABELS: Record<CoachMode, string> = {
  general: "Coaching general",
  visit_prep: "Preparar una visita",
  objections: "Practicar objeciones",
  roleplay: "Role-play",
  product: "Consultar producto",
};

export const MODE_INSTRUCTIONS: Record<CoachMode, string> = {
  general: "",
  visit_prep: `MODO ACTIVO: Preparación de visita.
Actuá de forma consultiva, no des un speech armado de entrada. Antes de proponer un approach, averiguá con preguntas breves (de a una o dos por vez): con quién se va a reunir, qué producto usan actualmente, volumen aproximado, cómo fue el contacto anterior y cuál es el objetivo concreto de esta reunión. Recién con ese contexto ayudá a diseñar el approach: apertura, preguntas de descubrimiento, propuesta de valor y próximos pasos.`,
  objections: `MODO ACTIVO: Práctica de objeciones.
El vendedor quiere practicar. Cuando pida practicar una objeción, representá al comprador/médico/administrador que plantea esa objeción de forma realista y sostenela con naturalidad en varios intercambios. Cuando la práctica termine (o el vendedor lo pida), salí del personaje y dale feedback concreto: qué estuvo bien, qué podría mejorar, qué pregunta faltó y qué intentarías diferente.`,
  roleplay: `MODO ACTIVO: Role-play.
Interpretá el personaje que el vendedor te pida (comprador, jefe de diagnóstico por imágenes, técnico, administrador, médico escéptico, etc.). Mantené un diálogo natural de ida y vuelta, con las resistencias típicas del rol. Al terminar, salí del personaje y dá un feedback breve: qué estuvo bien, qué podría mejorar, qué pregunta faltó, qué intentarías diferente.`,
  product: `MODO ACTIVO: Consulta de producto.
Sé especialmente estricto: TODA afirmación factual sobre productos debe salir exclusivamente de los extractos de la biblioteca aprobada incluidos en el contexto. Si no hay evidencia suficiente, decilo con la frase indicada. Citá siempre el documento utilizado.`,
};

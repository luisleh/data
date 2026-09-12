/**
 * Provider-agnostic AI interfaces. UI and API routes depend on
 * these types only; OpenAI lives behind them (src/lib/ai/openai).
 * Swapping providers = adding a new implementation + changing
 * the factory in `src/lib/ai/index.ts`.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  /** Streams the assistant reply as text deltas. */
  streamChat(messages: ChatMessage[], options?: { temperature?: number }): AsyncIterable<string>;
  /** Non-streaming completion (used for feedback, titles, etc.). */
  complete(messages: ChatMessage[], options?: { temperature?: number }): Promise<string>;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  embedOne(text: string): Promise<number[]>;
}

/** Guardrail categories — keep in sync with docs & tests. */
export const GUARDRAIL_CATEGORIES = [
  "commercial_coaching",
  "product_question",
  "professional_context",
  "out_of_scope",
] as const;

export type GuardrailCategory = (typeof GUARDRAIL_CATEGORIES)[number];

export interface GuardrailClassifier {
  classify(input: { message: string; recentHistory?: string[] }): Promise<GuardrailCategory>;
}

/**
 * Provider factory. This is the single place to change when
 * swapping AI vendors: return different implementations here.
 */
import type { ChatProvider, EmbeddingProvider, GuardrailClassifier } from "./types";
import { OpenAIChatProvider } from "./openai/chat";
import { OpenAIEmbeddingProvider } from "./openai/embeddings";
import { OpenAIGuardrailClassifier } from "./openai/guardrail";

export function getChatProvider(): ChatProvider {
  return new OpenAIChatProvider();
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return new OpenAIEmbeddingProvider();
}

export function getGuardrailClassifier(): GuardrailClassifier {
  return new OpenAIGuardrailClassifier();
}

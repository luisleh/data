import { serverEnv } from "@/lib/env";
import type { EmbeddingProvider } from "@/lib/ai/types";
import { getOpenAI } from "./client";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private model: string = serverEnv.embeddingModel) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await getOpenAI().embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async embedOne(text: string): Promise<number[]> {
    const [embedding] = await this.embed([text]);
    return embedding;
  }
}

import { serverEnv } from "@/lib/env";
import type { ChatMessage, ChatProvider } from "@/lib/ai/types";
import { getOpenAI } from "./client";

export class OpenAIChatProvider implements ChatProvider {
  constructor(private model: string = serverEnv.chatModel) {}

  async *streamChat(
    messages: ChatMessage[],
    options?: { temperature?: number },
  ): AsyncIterable<string> {
    const stream = await getOpenAI().chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.6,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async complete(
    messages: ChatMessage[],
    options?: { temperature?: number },
  ): Promise<string> {
    const completion = await getOpenAI().chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.6,
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

let cached: OpenAI | null = null;

/** Server-side OpenAI client. Never import from client components. */
export function getOpenAI(): OpenAI {
  if (!cached) {
    cached = new OpenAI({ apiKey: serverEnv.openaiApiKey });
  }
  return cached;
}

/**
 * Central, typed access to environment variables.
 * Server-only secrets are validated lazily so the client bundle
 * never imports them.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
};

export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get openaiApiKey() {
    return required("OPENAI_API_KEY");
  },
  get chatModel() {
    return process.env.OPENAI_CHAT_MODEL ?? "gpt-4o";
  },
  get guardrailModel() {
    return process.env.OPENAI_GUARDRAIL_MODEL ?? "gpt-4o-mini";
  },
  get embeddingModel() {
    return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  },
  get realtimeModel() {
    return process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime";
  },
};

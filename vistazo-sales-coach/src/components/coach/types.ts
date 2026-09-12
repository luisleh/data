export interface UiSource {
  documentId: string;
  title: string;
  product?: string | null;
  version?: string | null;
  similarity?: number | null;
}

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  inputType: "text" | "voice";
  sources?: UiSource[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
}

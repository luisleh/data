"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { COACH_MODES, MODE_LABELS, type CoachMode } from "@/lib/coach/modes";
import { useVoiceSession, type VoiceSource } from "@/hooks/useVoiceSession";
import { MessageBubble } from "./MessageBubble";
import type { ConversationSummary, UiMessage, UiSource } from "./types";

const MODE_OPENERS: Record<CoachMode, string> = {
  general: "",
  visit_prep: "Quiero preparar una visita comercial.",
  objections: "Quiero practicar manejo de objeciones.",
  roleplay: "Quiero hacer un role-play de una reunión comercial.",
  product: "Quiero hacer una consulta sobre un producto.",
};

export function CoachShell({ userName, isAdmin }: { userName: string; isAdmin: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [mode, setMode] = useState<CoachMode>("general");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  conversationIdRef.current = conversationId;
  const modeRef = useRef<CoachMode>(mode);
  modeRef.current = mode;

  const appendMessage = useCallback((message: UiMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // ---- Voice session: transcripts land in the SAME conversation ----
  const persistTranscript = useCallback(
    async (role: "user" | "assistant", content: string, sources?: VoiceSource[]) => {
      try {
        const response = await fetch("/api/realtime/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            mode: modeRef.current,
            role,
            content,
            sources,
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as { conversationId: string };
          if (!conversationIdRef.current) setConversationId(data.conversationId);
        }
      } catch {
        // Non-fatal: the message is still visible in the UI.
      }
    },
    [],
  );

  const voice = useVoiceSession({
    onUserTranscript: (text) => {
      appendMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        inputType: "voice",
      });
      void persistTranscript("user", text);
    },
    onAssistantTranscript: (text, sources) => {
      const uiSources: UiSource[] = (sources ?? []).map((s) => ({
        documentId: s.documentId,
        title: s.title,
        similarity: s.similarity,
      }));
      appendMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        inputType: "voice",
        sources: uiSources.length ? dedupeSources(uiSources) : undefined,
      });
      void persistTranscript("assistant", text, sources);
    },
    onError: (message) => setVoiceError(message),
  });

  // ---- Data loading ----
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = (await response.json()) as { conversations: ConversationSummary[] };
        setConversations(data.conversations);
      }
    } catch {
      // ignore; sidebar just stays empty
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function openConversation(id: string) {
    voice.stop();
    setPanelOpen(false);
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversation: { id: string; mode: string };
        messages: {
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
          input_type: "text" | "voice";
        }[];
        sources: {
          message_id: string;
          document_id: string;
          document_title: string;
          similarity: number | null;
        }[];
      };
      const sourcesByMessage = new Map<string, UiSource[]>();
      for (const s of data.sources) {
        const list = sourcesByMessage.get(s.message_id) ?? [];
        list.push({ documentId: s.document_id, title: s.document_title, similarity: s.similarity });
        sourcesByMessage.set(s.message_id, list);
      }
      setConversationId(data.conversation.id);
      if ((COACH_MODES as readonly string[]).includes(data.conversation.mode)) {
        setMode(data.conversation.mode as CoachMode);
      }
      setMessages(
        data.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            inputType: m.input_type,
            sources: sourcesByMessage.get(m.id),
          })),
      );
    } catch {
      // ignore
    }
  }

  function startNewConversation() {
    voice.stop();
    setConversationId(null);
    setMessages([]);
    setMode("general");
    setPanelOpen(false);
  }

  // ---- Text chat (NDJSON stream) ----
  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setInput("");
    setSending(true);
    setVoiceError(null);
    appendMessage({ id: crypto.randomUUID(), role: "user", content: trimmed, inputType: "text" });

    const assistantId = crypto.randomUUID();
    let assistantAdded = false;
    let assistantSources: UiSource[] | undefined;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId, mode }),
      });
      if (!response.ok || !response.body) {
        throw new Error("request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: {
          type: string;
          conversationId?: string;
          sources?: UiSource[];
          text?: string;
        };
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        if (event.type === "meta" && event.conversationId) {
          setConversationId(event.conversationId);
        } else if (event.type === "sources") {
          assistantSources = event.sources;
        } else if (event.type === "delta" && event.text) {
          const delta = event.text;
          if (!assistantAdded) {
            assistantAdded = true;
            appendMessage({
              id: assistantId,
              role: "assistant",
              content: delta,
              inputType: "text",
              sources: assistantSources,
            });
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + delta } : m,
              ),
            );
          }
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
      }
      if (buffer) processLine(buffer);
    } catch {
      appendMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "No pude procesar el mensaje. Revisá tu conexión e intentá de nuevo.",
        inputType: "text",
      });
    } finally {
      setSending(false);
      void loadConversations();
    }
  }

  function selectMode(newMode: CoachMode) {
    setMode(newMode);
    const opener = MODE_OPENERS[newMode];
    if (opener && !sending) void sendMessage(opener);
  }

  async function handleLogout() {
    voice.stop();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleVoice() {
    setVoiceError(null);
    if (voice.status === "active" || voice.status === "connecting") {
      voice.stop();
    } else {
      void voice.start({ conversationId, mode });
    }
  }

  const voiceActive = voice.status === "active" || voice.status === "connecting";

  return (
    <div className="coach-shell">
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button
            className="btn btn-small"
            onClick={() => setPanelOpen(!panelOpen)}
            aria-label="Historial de conversaciones"
          >
            ☰
          </button>
          <div className="brand">
            <h1>Vistazo Sales Coach</h1>
            <p>Tu coach comercial de medios de contraste</p>
          </div>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <Link href="/admin" className="btn btn-small">
              Admin
            </Link>
          )}
          <button className="btn btn-small" onClick={handleLogout} title={userName}>
            Salir
          </button>
        </div>
      </header>

      <div className="coach-body">
        <aside className={`conversation-panel${panelOpen ? " open" : ""}`}>
          <div className="panel-head">
            <strong>Conversaciones</strong>
            <button className="btn btn-small btn-primary" onClick={startNewConversation}>
              + Nueva
            </button>
          </div>
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`conversation-item${c.id === conversationId ? " active" : ""}`}
              onClick={() => void openConversation(c.id)}
            >
              <div className="conv-title">{c.title}</div>
              <div className="conv-meta">
                {MODE_LABELS[(c.mode as CoachMode) in MODE_LABELS ? (c.mode as CoachMode) : "general"]}
                {" · "}
                {new Date(c.updated_at).toLocaleDateString("es-AR")}
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <p style={{ padding: 16, color: "var(--text-muted)", fontSize: 14 }}>
              Todavía no hay conversaciones.
            </p>
          )}
        </aside>

        <main className="chat-main">
          <div className="mode-row" role="tablist" aria-label="Modos de coaching">
            {COACH_MODES.filter((m) => m !== "general").map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className={`mode-chip${mode === m ? " active" : ""}`}
                onClick={() => selectMode(m)}
                disabled={sending}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="messages-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty-state">
                <h2>¿En qué trabajamos hoy?</h2>
                <p>
                  Elegí un modo arriba o escribí directamente: preparar una visita, practicar
                  una objeción, hacer un role-play o consultar un producto de la biblioteca
                  aprobada.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {sending && <div className="typing">El coach está escribiendo…</div>}
          </div>

          {voiceActive && (
            <div className="voice-banner">
              <span className="voice-status">
                <span
                  className={`voice-dot${voice.status === "connecting" ? " connecting" : ""}`}
                />
                {voice.status === "connecting"
                  ? "Conectando voz…"
                  : "Conversación de voz activa — hablá con tu coach"}
              </span>
              <button className="btn btn-small btn-danger" onClick={toggleVoice}>
                Terminar voz
              </button>
            </div>
          )}
          {voiceError && (
            <div className="voice-banner" style={{ background: "var(--danger-soft)" }}>
              <span style={{ color: "var(--danger)", fontSize: 14 }}>{voiceError}</span>
              <button className="btn btn-small" onClick={() => setVoiceError(null)}>
                Cerrar
              </button>
            </div>
          )}

          <div className="composer">
            <textarea
              value={input}
              placeholder="Escribile a tu coach…"
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              disabled={sending}
              aria-label="Mensaje para el coach"
            />
            <button
              className={`btn btn-icon${voiceActive ? " mic-active" : ""}`}
              onClick={toggleVoice}
              title={voiceActive ? "Terminar conversación de voz" : "Hablar con el coach"}
              aria-label={voiceActive ? "Terminar conversación de voz" : "Hablar con el coach"}
            >
              {voiceActive ? "■" : "🎙"}
            </button>
            <button
              className="btn btn-icon btn-primary"
              onClick={() => void sendMessage(input)}
              disabled={sending || !input.trim()}
              title="Enviar"
              aria-label="Enviar mensaje"
            >
              ➤
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function dedupeSources(sources: UiSource[]): UiSource[] {
  const seen = new Map<string, UiSource>();
  for (const source of sources) {
    if (!seen.has(source.documentId)) seen.set(source.documentId, source);
  }
  return [...seen.values()];
}

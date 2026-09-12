import type { UiMessage } from "./types";

export function MessageBubble({ message }: { message: UiMessage }) {
  return (
    <>
      <div className={`msg ${message.role}`}>
        {message.content}
        {message.inputType === "voice" && <span className="voice-tag">🎙 voz</span>}
      </div>
      {message.role === "assistant" && message.sources && message.sources.length > 0 && (
        <div className="msg-sources" aria-label="Fuentes de la biblioteca aprobada">
          {message.sources.map((source) => (
            <span key={source.documentId} className="source-chip" title="Documento de la biblioteca aprobada">
              📄 {source.title}
              {source.version ? ` · v${source.version}` : ""}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

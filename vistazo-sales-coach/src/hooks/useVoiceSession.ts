"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceStatus = "idle" | "connecting" | "active" | "error";

export interface VoiceSource {
  documentId: string;
  chunkId?: string | null;
  title: string;
  similarity?: number | null;
}

interface VoiceCallbacks {
  /** Final transcript of what the seller said. */
  onUserTranscript: (text: string) => void;
  /** Final transcript of the coach's spoken reply (+ RAG sources used). */
  onAssistantTranscript: (text: string, sources: VoiceSource[]) => void;
  onError: (message: string) => void;
}

/**
 * Natural voice conversation via OpenAI Realtime over WebRTC.
 * - The OpenAI API key NEVER reaches the browser: the server mints
 *   an ephemeral client secret (`/api/realtime/session`).
 * - Barge-in (interrupting the coach) is native to the Realtime API.
 * - RAG stays server-side: the model's `search_library` tool calls
 *   are relayed to `/api/realtime/tool`.
 */
export function useVoiceSession(callbacks: VoiceCallbacks) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingSourcesRef = useRef<VoiceSource[]>([]);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const stop = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    pendingSourcesRef.current = [];
    setStatus("idle");
  }, []);

  const handleToolCall = useCallback(
    async (event: { name?: string; call_id?: string; arguments?: string }) => {
      const channel = dataChannelRef.current;
      if (!channel || channel.readyState !== "open") return;
      if (event.name !== "search_library" || !event.call_id) return;

      let output: unknown = { found: false, message: "Error de búsqueda" };
      try {
        const args = JSON.parse(event.arguments ?? "{}") as { query?: string };
        const response = await fetch("/api/realtime/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "search_library", query: args.query ?? "" }),
        });
        if (response.ok) {
          const data = (await response.json()) as {
            result: unknown;
            sources: VoiceSource[];
          };
          output = data.result;
          // Attach sources to the coach's next spoken reply.
          pendingSourcesRef.current = data.sources ?? [];
        }
      } catch {
        // fall through with the error output
      }

      channel.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: event.call_id,
            output: JSON.stringify(output),
          },
        }),
      );
      channel.send(JSON.stringify({ type: "response.create" }));
    },
    [],
  );

  const start = useCallback(
    async (options: { conversationId: string | null; mode: string }) => {
      if (pcRef.current) return;
      setStatus("connecting");

      try {
        // 1. Ephemeral session token from our server.
        const sessionResponse = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });
        if (!sessionResponse.ok) {
          throw new Error("No se pudo iniciar la sesión de voz");
        }
        const { clientSecret, model } = (await sessionResponse.json()) as {
          clientSecret: string;
          model: string;
        };

        // 2. Microphone.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // 3. WebRTC peer connection.
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0];
        };

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const channel = pc.createDataChannel("oai-events");
        dataChannelRef.current = channel;

        channel.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data as string);
            switch (event.type) {
              case "conversation.item.input_audio_transcription.completed": {
                const text = (event.transcript as string | undefined)?.trim();
                if (text) callbacksRef.current.onUserTranscript(text);
                break;
              }
              case "response.output_audio_transcript.done":
              case "response.audio_transcript.done": {
                const text = (event.transcript as string | undefined)?.trim();
                if (text) {
                  callbacksRef.current.onAssistantTranscript(
                    text,
                    pendingSourcesRef.current,
                  );
                  pendingSourcesRef.current = [];
                }
                break;
              }
              case "response.function_call_arguments.done": {
                void handleToolCall(event);
                break;
              }
              case "error": {
                callbacksRef.current.onError(
                  event.error?.message ?? "Error en la sesión de voz",
                );
                break;
              }
            }
          } catch {
            // ignore malformed events
          }
        };

        pc.onconnectionstatechange = () => {
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            callbacksRef.current.onError("Se perdió la conexión de voz");
            stop();
          }
        };

        // 4. SDP exchange with OpenAI using the ephemeral token.
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(
          `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp,
          },
        );
        if (!sdpResponse.ok) {
          throw new Error("El proveedor de voz rechazó la conexión");
        }
        await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });

        setStatus("active");
      } catch (error) {
        stop();
        setStatus("error");
        callbacksRef.current.onError(
          error instanceof Error ? error.message : "No se pudo iniciar la voz",
        );
      }
    },
    [handleToolCall, stop],
  );

  return { status, start, stop };
}

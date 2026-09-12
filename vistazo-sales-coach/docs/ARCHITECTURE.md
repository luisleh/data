# Arquitectura — Vistazo Sales Coach

Este documento explica cómo está resuelto cada requisito del MVP y qué decisiones se tomaron (y por qué), para que otro desarrollador pueda continuar el proyecto.

## Principios

1. **UI ≠ lógica**: los componentes React solo renderizan y llaman rutas API. Toda la lógica vive en `src/lib/`.
2. **Proveedor de IA reemplazable**: `src/lib/ai/types.ts` define interfaces (`ChatProvider`, `EmbeddingProvider`, `GuardrailClassifier`); `src/lib/ai/openai/` es la única implementación actual y `src/lib/ai/index.ts` es la fábrica. Cambiar de proveedor = nueva implementación + tocar la fábrica. Los modelos concretos se eligen por variables de entorno.
3. **Secrets solo server-side**: las claves de OpenAI y el service role de Supabase jamás llegan al bundle del cliente (`src/lib/env.ts` separa `publicEnv` de `serverEnv`).
4. **Privacidad por defecto**: RLS por usuario; el admin no lee conversaciones ajenas.

## Flujo del chat de texto (`POST /api/chat`)

```
mensaje del vendedor
  → autenticación (cookie Supabase) + validación zod
  → guardrail (capa explícita, ANTES del modelo principal)
      out_of_scope → respuesta fija de redirección, el coach nunca se invoca
  → retrieval RAG (si es product_question, modo "product", o el texto
    menciona hechos técnicos — heurística mentionsProductFacts)
  → system prompt compuesto en capas:
      identidad/dominio + lineamientos del admin (DB) + modo + evidencia RAG
  → streaming NDJSON al cliente: {meta} {sources} {delta}* {done}
  → persistencia: mensaje user + assistant + message_sources
```

Respuesta con evidencia: los chunks citados viajan como evento `sources` y quedan en `message_sources`, de donde la UI dibuja los chips de fuente al reabrir la conversación.

## Guardrail de dominio (`src/lib/guardrail/`)

Requisito clave: **no depender de un único system prompt** y que sea **testeable**.

- **Etapa 1 — heurística determinística** (`heuristics.ts`): función pura, sin red. Solo decide `out_of_scope` ante patrones inequívocos (recetas, deportes, horóscopo…); ante señales de dominio o ambigüedad, difiere. Testeada sin mocks.
- **Etapa 2 — clasificador LLM** (`OpenAIGuardrailClassifier`, `gpt-4o-mini`, salida JSON, temperatura 0) con el historial reciente como contexto para que un "es muy caro" dentro de un role-play no se clasifique fuera de dominio.
- La orquestación (`classifyMessage`) recibe el clasificador **inyectado**, así los tests lo mockean (`tests/guardrail.test.ts`).
- Ante fallo del clasificador: degrada a `professional_context` (el coach responde, pero siempre bajo el system prompt de dominio — nunca como asistente general).
- Cada mensaje guarda su categoría en `messages.guardrail_category` para auditoría.
- Además, el system prompt del coach repite las reglas de dominio (defensa en profundidad).

**Limitación conocida (voz)**: en la sesión Realtime no hay un hook previo por turno, así que el guardrail de voz se aplica vía instrucciones de la sesión + la regla de que todo dato técnico pase por la herramienta `search_library` (server-side). Si hiciera falta endurecerlo, se puede clasificar la transcripción a posteriori y cortar la sesión.

## RAG / Biblioteca aprobada (`src/lib/rag/`)

- **Ingesta** (`ingest.ts`): PDF (bucket privado `knowledge`) → `unpdf` extrae texto → `chunk.ts` corta en ~1500 chars con solapamiento 200 respetando párrafos/oraciones → embeddings (`text-embedding-3-small`, 1536 dims) → `document_chunks` (pgvector). El documento pasa por estados `processing → ready | error` (visible en el panel admin).
- **Retrieval** (`retrieve.ts`): embedding de la consulta → RPC `match_document_chunks` (similitud coseno). La función SQL **filtra `active = true` y `status = 'ready'`** — retirar un documento es desactivarlo, sin borrarlo; el corpus crece desde el panel admin sin redeploy.
- **Umbral** `MIN_SIMILARITY = 0.25`: por debajo se considera que la biblioteca no tiene evidencia y el prompt fuerza la respuesta "No encuentro información suficiente en la biblioteca aprobada…".
- **Metadata por documento**: título, producto, tipo, país, idioma, versión, fecha de vigencia, fuente, activo/inactivo — pensada para evolucionar a flujos regulatorios (aprobaciones, reemplazo de versiones) sin migrar el modelo.
- Ingesta síncrona dentro del request de subida: decisión deliberada del MVP (en Vercel el trabajo post-respuesta no está garantizado). Para corpora grandes, moverla a un job (Supabase Edge Function / cola).

## Voz (`src/hooks/useVoiceSession.ts` + `/api/realtime/*`)

- **Seguridad**: `POST /api/realtime/session` corre server-side, arma las instrucciones (lineamientos + modo + últimos 20 mensajes de la conversación → **texto y voz comparten contexto**) y le pide a OpenAI un **client secret efímero** (`/v1/realtime/client_secrets`). El browser solo ve ese token de un solo uso.
- **Transporte**: WebRTC directo browser ↔ OpenAI (audio bidireccional + data channel de eventos). La interrupción del coach (barge-in) es nativa del Realtime API.
- **RAG en voz**: la sesión declara la tool `search_library`; cuando el modelo la llama, el cliente releva la llamada a `POST /api/realtime/tool` (autenticado, server-side) y devuelve el resultado por el data channel. Las fuentes usadas se adjuntan a la siguiente transcripción del coach.
- **Persistencia**: las transcripciones finales (usuario y coach) se guardan vía `POST /api/realtime/transcript` en la misma conversación con `input_type = 'voice'`, de modo que al volver al texto el contexto continúa.
- El modelo realtime es configurable (`OPENAI_REALTIME_MODEL`); si OpenAI renombra el modelo de voz, es un cambio de env var.

## Lineamientos del administrador

- Tabla `manager_guidelines` **append-only**: cada guardado inserta una fila con `updated_by` + `updated_at` → historial de versiones gratis; la vigente es la más reciente.
- Se leen en cada request de chat/voz y se inyectan como capa del system prompt → afectan las próximas interacciones sin redeploy.
- Se leen con el service role (los vendedores no tienen SELECT sobre la tabla) — los lineamientos moldean al coach pero no son visibles/editables para el vendedor.

## Modelo de datos y RLS

Tablas: `profiles`, `conversations`, `messages`, `message_sources`, `manager_guidelines`, `knowledge_documents`, `document_chunks` (ver migración).

- `profiles.role` (`seller` | `admin`) lo escribe un trigger al registrarse (siempre `seller`) o un operador vía SQL. **El cliente no puede escribir `profiles`** y el server siempre relee el rol de la DB (`getAuthenticatedUser`/`getAdminUser`).
- Conversaciones/mensajes/fuentes: políticas por `user_id` — un vendedor no puede leer datos de otro ni siquiera con la anon key en la mano.
- `document_chunks`: sin políticas → invisible para cualquier cliente; solo el service role (server) lo toca. `match_document_chunks` tiene el EXECUTE revocado para `anon`/`authenticated`.
- Storage: bucket `knowledge` privado, sin políticas de acceso público.

## Decisiones reversibles documentadas

| Decisión | Motivo | Cómo revertir/evolucionar |
|---|---|---|
| Proyecto en subdirectorio `vistazo-sales-coach/` del repo `data` | El repo asignado es un fork de datasets; se evita mezclar | Mover la carpeta a un repo propio; Vercel solo cambia el Root Directory |
| CSS plano con design tokens (sin Tailwind) | Menos dependencias; branding futuro = cambiar variables en `globals.css` | Introducir Tailwind/design system cuando haya branding |
| pgvector en Supabase (no un vector DB dedicado) | Un solo backend, RLS y metadata en el mismo lugar, escala de sobra para este corpus | Retriever está aislado en `rag/retrieve.ts`; cambiar de motor no toca el resto |
| Ingesta síncrona en el request de subida | Simplicidad; subir documentos es una acción admin poco frecuente | Encolar (Edge Function/cron) para corpora grandes |
| Registro abierto con rol `seller` fijo | Cumple "puedo crear un usuario vendedor" sin panel de usuarios | Desactivar signup en Supabase y crear usuarios desde el dashboard, o agregar invitaciones |
| Voz: guardrail por instrucciones + tool server-side | El Realtime API no ofrece hook previo por turno | Clasificación post-transcripción con corte de sesión |

## Costos / lock-in a vigilar

- **OpenAI Realtime** se cobra por minuto de audio: es el costo dominante si el equipo usa mucho la voz. El chat de texto (gpt-4o + mini para guardrail + embeddings) es marginal en comparación.
- No hay lock-in fuerte: OpenAI queda detrás de interfaces; Supabase es Postgres estándar (el SQL de la migración corre en cualquier Postgres + pgvector).

## Qué NO tiene este MVP (a propósito)

Odoo, CRM, registro de visitas, rankings/gamificación, LMS, WhatsApp/emails, dashboards gerenciales, memoria comercial avanzada, apps nativas, multi-organización. El modelo de datos deja espacio para el flujo regulatorio de documentos (estados/versiones) sin migraciones disruptivas.

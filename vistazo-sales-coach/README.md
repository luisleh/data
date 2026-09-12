# Vistazo Sales Coach

**Tu coach comercial de medios de contraste.**

MVP de un coach comercial con IA para vendedores de Vistazo Pharma Group: chat de texto, conversación por voz natural, modos de coaching (preparación de visitas, objeciones, role-play, consulta de producto), RAG sobre una biblioteca de documentos aprobados y panel de administración.

- Stack: **Next.js 15 (App Router) + TypeScript · Supabase (Auth, Postgres + pgvector, Storage) · OpenAI (chat, embeddings, Realtime/voz)**
- Arquitectura y decisiones: ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

> **Flujo actual: desarrollo y ejecución local** (`npm run dev`). La arquitectura queda lista para Vercel, pero el deployment es un paso futuro (sección 6). Lo único externo que la app necesita siempre es la API de OpenAI; Supabase puede ser un proyecto cloud (free) o el stack local de la CLI de Supabase.

---

## 1. Requisitos

- Node.js 20+ (probado con 22)
- Una API key de [OpenAI](https://platform.openai.com) con acceso a chat, embeddings y Realtime
- Supabase, en cualquiera de sus dos variantes:
  - **Opción A (recomendada para empezar)**: un proyecto cloud gratuito en [supabase.com](https://supabase.com)
  - **Opción B (todo local)**: la [CLI de Supabase](https://supabase.com/docs/guides/local-development) + Docker
- (Solo para el deploy futuro) una cuenta de [Vercel](https://vercel.com)

## 2. Configurar Supabase

### Opción A: proyecto cloud (free tier)

1. Creá un proyecto nuevo en Supabase.
2. En **Database → Extensions**, habilitá la extensión `vector` (pgvector).
3. Abrí el **SQL Editor** y ejecutá el contenido completo de
   [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
   Esto crea todas las tablas, las políticas RLS, la función de búsqueda vectorial y el bucket privado `knowledge`.
4. En **Authentication → Providers → Email**: dejá habilitado Email/Password.
   - Para desarrollo, podés desactivar "Confirm email" y así entrar sin verificación.
5. Copiá de **Settings → API**: la URL del proyecto, la `anon key` y la `service_role key`.

### Opción B: Supabase local (CLI + Docker)

Para desarrollar sin ningún servicio cloud salvo OpenAI:

```bash
cd vistazo-sales-coach
supabase init            # crea supabase/config.toml (la carpeta migrations ya existe)
supabase start           # levanta Postgres, Auth, Storage y Studio en Docker
supabase db reset        # aplica supabase/migrations/ sobre la base local
```

`supabase start` imprime la `API URL`, la `anon key` y la `service_role key` locales: usá esas en `.env.local`. Studio queda en `http://127.0.0.1:54323` (ahí tenés el SQL editor para, por ejemplo, promover el admin). La extensión `vector` ya viene incluida en la imagen local.

### Crear el primer administrador

Los registros desde la app crean siempre vendedores (`seller`) — el rol nunca lo decide el cliente. Para promover un usuario a admin, ejecutá en el SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@tuempresa.com');
```

## 3. Configurar el entorno local

```bash
cd vistazo-sales-coach
npm install
cp .env.example .env.local
# completá .env.local con tus credenciales
npm run dev
```

Variables de entorno (ver [`.env.example`](.env.example)):

| Variable | Dónde vive | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + server | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + server | Anon key (segura en el browser: manda RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo server** | Bypassea RLS; ingesta RAG y operaciones admin |
| `OPENAI_API_KEY` | **solo server** | Nunca llega al frontend |
| `OPENAI_CHAT_MODEL` | server | Default `gpt-4o` |
| `OPENAI_GUARDRAIL_MODEL` | server | Default `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | server | Default `text-embedding-3-small` (1536 dims — si lo cambiás, ajustá `vector(1536)` en la migración) |
| `OPENAI_REALTIME_MODEL` | server | Default `gpt-realtime` (voz) |

## 4. Probar el flujo completo

1. Abrí `http://localhost:3000`, creá una cuenta de vendedor e ingresá.
2. Chateá con el coach; probá los modos (Preparar una visita, Practicar objeciones, Role-play, Consultar producto).
3. Tocá el micrófono 🎙 para pasar a voz (el navegador pide permiso de micrófono; la sesión de voz continúa la misma conversación). Tocá ■ para volver al texto.
4. Promové tu usuario a admin (SQL de arriba), recargá y entrá a **Admin**:
   - Editá los **Lineamientos comerciales del equipo** — aplican a las próximas interacciones sin redeploy.
   - Subí un **PDF de prueba** con su metadata (producto, tipo, país, idioma, versión, vigencia, fuente). Al terminar la ingesta queda `activo` y el coach lo usa como evidencia citando la fuente.
   - **Importante**: los documentos cargados durante el desarrollo son solo de prueba; el corpus real se carga después desde esta misma pantalla, sin tocar código.
5. Preguntá algo técnico que esté en el PDF → la respuesta muestra el documento fuente. Preguntá algo técnico que **no** esté → responde "No encuentro información suficiente en la biblioteca aprobada…". Preguntá "¿cómo hago pollo con papas?" → rechaza y redirige.

## 5. Tests

```bash
npm test          # vitest: guardrail de dominio, chunking RAG, composición de prompts
npm run typecheck # tsc --noEmit
npm run build     # build de producción
```

Los tests del guardrail (`tests/guardrail.test.ts`) cubren la clasificación con el LLM mockeado: el guardrail es una capa explícita e inyectable, no depende de un único system prompt.

## 6. Deploy en Vercel (paso futuro — no requerido ahora)

Nada del código depende de Vercel: no hay APIs propietarias de la plataforma, solo rutas estándar de Next.js. Cuando llegue el momento:

1. Importá el repositorio en Vercel.
2. **Root Directory**: `vistazo-sales-coach` (el proyecto vive en un subdirectorio del repo).
3. Cargá todas las variables de entorno de `.env.example` en **Settings → Environment Variables**.
4. Deploy. La subida+ingesta de PDFs usa `maxDuration = 300`; en el plan Hobby el límite es menor — con PDFs de prueba chicos alcanza, para corpora grandes conviene el plan Pro o mover la ingesta a un job.

## 7. Estructura del proyecto

```
vistazo-sales-coach/
├── docs/ARCHITECTURE.md          # decisiones de arquitectura
├── supabase/migrations/          # SQL: esquema + RLS + pgvector
├── src/
│   ├── app/                      # rutas (App Router)
│   │   ├── login/  coach/  admin/
│   │   └── api/
│   │       ├── chat/             # chat streaming (guardrail + RAG)
│   │       ├── conversations/    # historial (RLS)
│   │       ├── realtime/         # voz: session (token efímero), tool (RAG), transcript
│   │       └── admin/            # guidelines + documents (solo admin)
│   ├── components/               # UI (coach/, admin/)
│   ├── hooks/useVoiceSession.ts  # WebRTC + OpenAI Realtime
│   ├── lib/
│   │   ├── ai/                   # interfaces de proveedor + implementación OpenAI
│   │   ├── guardrail/            # clasificador de dominio (testeable)
│   │   ├── rag/                  # chunking, ingesta, retrieval (solo docs activos)
│   │   ├── coach/                # modos + composición de prompts
│   │   ├── supabase/             # clients (browser / server / service-role)
│   │   ├── auth.ts  conversations.ts  guidelines.ts  env.ts  logger.ts
│   └── middleware.ts             # refresh de sesión + protección de rutas
└── tests/                        # vitest
```

## 8. Seguridad

- API keys de OpenAI y service role de Supabase: **solo server-side**, vía variables de entorno. `.env*` está en `.gitignore`; usar `.env.example` como plantilla.
- **RLS en todas las tablas**: un vendedor solo puede leer/escribir sus propias conversaciones, mensajes y fuentes; los lineamientos solo los administra el admin; los chunks del RAG no son accesibles desde el cliente.
- El **rol se lee siempre de la base** (`profiles.role`) en el servidor; nunca se confía en el rol enviado por el cliente.
- La sesión de voz usa **client secrets efímeros** generados server-side; la API key real nunca llega al browser.
- Validación de archivos en la subida (solo PDF, tamaño máximo) y validación de inputs con `zod` en todas las rutas API.
- Privacidad por defecto: el admin no tiene acceso a las conversaciones individuales de los vendedores.

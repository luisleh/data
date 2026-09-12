-- ============================================================
-- Vistazo Sales Coach — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Requires the `vector` extension (Dashboard > Database > Extensions).
-- ============================================================

create extension if not exists vector;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
-- Roles live in `profiles.role`, written only by triggers /
-- service role. The client can never set its own role: RLS
-- below forbids updating `profiles` from the client entirely.

create type user_role as enum ('seller', 'admin');
create type message_role as enum ('user', 'assistant', 'system');
create type input_type as enum ('text', 'voice');

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'seller',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile when a user signs up. Role is ALWAYS
-- 'seller' by default; admins are promoted manually (see README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies and server code.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles: read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- No insert/update/delete policies for clients: profile rows are
-- managed by the trigger and by the service role only.

-- ------------------------------------------------------------
-- conversations
-- ------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Nueva conversación',
  mode text not null default 'general', -- general | visit_prep | objections | roleplay | product
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

-- Privacy by default: each seller sees only their own
-- conversations. Admins do NOT get read access to conversations.
create policy "conversations: own rows"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations: insert own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "conversations: update own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations: delete own"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- messages
-- ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  input_type input_type not null default 'text',
  mode text not null default 'general',
  guardrail_category text, -- classification recorded for auditing/testing
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "messages: read own via conversation"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "messages: insert own via conversation"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- manager_guidelines (versioned: every save inserts a new row;
-- the active version is the most recent one)
-- ------------------------------------------------------------
create table public.manager_guidelines (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index manager_guidelines_updated_idx on public.manager_guidelines (updated_at desc);

alter table public.manager_guidelines enable row level security;

create policy "guidelines: admins read"
  on public.manager_guidelines for select
  using (public.is_admin());

create policy "guidelines: admins insert"
  on public.manager_guidelines for insert
  with check (public.is_admin() and updated_by = auth.uid());

-- ------------------------------------------------------------
-- knowledge_documents (approved library)
-- ------------------------------------------------------------
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product text,
  document_type text, -- ficha_tecnica | brochure | paper | estudio | faq | otro
  country text,
  language text default 'es',
  version text,
  effective_date date,
  source text, -- e.g. "GE HealthCare", "Vistazo"
  active boolean not null default true,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  status text not null default 'processing', -- processing | ready | error
  status_detail text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index knowledge_documents_active_idx on public.knowledge_documents (active);

alter table public.knowledge_documents enable row level security;

-- Sellers may read metadata of active documents (so the UI can
-- show sources); only admins see everything and manage them.
create policy "documents: sellers read active"
  on public.knowledge_documents for select
  using (active = true or public.is_admin());

create policy "documents: admins insert"
  on public.knowledge_documents for insert
  with check (public.is_admin());

create policy "documents: admins update"
  on public.knowledge_documents for update
  using (public.is_admin());

create policy "documents: admins delete"
  on public.knowledge_documents for delete
  using (public.is_admin());

-- ------------------------------------------------------------
-- document_chunks (RAG index) — server-side only, no client
-- policies at all: accessed exclusively through the service role.
-- ------------------------------------------------------------
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index document_chunks_document_idx on public.document_chunks (document_id);
-- ivfflat needs data to build good lists; fine to create up front for an MVP.
create index document_chunks_embedding_idx on public.document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.document_chunks enable row level security;
-- (no policies: only the service role can touch this table)

-- Similarity search restricted to ACTIVE documents only.
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  min_similarity float default 0.25
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity float,
  document_title text,
  document_product text,
  document_version text,
  document_source text
)
language sql
security definer set search_path = public
stable
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity,
    kd.title as document_title,
    kd.product as document_product,
    kd.version as document_version,
    kd.source as document_source
  from public.document_chunks dc
  join public.knowledge_documents kd on kd.id = dc.document_id
  where kd.active = true
    and kd.status = 'ready'
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= min_similarity
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- Function is called with the service role from the server; do
-- not expose it to anon/authenticated.
revoke execute on function public.match_document_chunks from public, anon, authenticated;

-- ------------------------------------------------------------
-- message_sources (RAG citations attached to assistant messages)
-- ------------------------------------------------------------
create table public.message_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_id uuid references public.document_chunks (id) on delete set null,
  document_title text not null,
  similarity float,
  created_at timestamptz not null default now()
);

create index message_sources_message_idx on public.message_sources (message_id);

alter table public.message_sources enable row level security;

create policy "sources: read own via message"
  on public.message_sources for select
  using (
    exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and c.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- Storage bucket for the approved library (private)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

-- No storage policies: the bucket is private and only reachable
-- through the service role on the server.

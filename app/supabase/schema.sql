-- Cuidador Canino - Esquema Supabase (plan Free)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- Tablas espejo de IndexedDB: contacts/dogs/services/events/templates
-- Columna `data` guarda el registro YA CIFRADO (prefijo enc:) tal como está en IndexedDB.
-- RLS: cada fila pertenece a un usuario (auth.uid()). Sin RLS los datos serían visibles entre usuarios.

-- Limpieza opcional (descomentar si quieres recrear):
-- drop table if exists templates cascade;
-- drop table if exists events cascade;
-- drop table if exists services cascade;
-- drop table if exists dogs cascade;
-- drop table if exists contacts cascade;

create table if not exists contacts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists dogs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists services (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists templates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Indices para RLS y sincronización
create index if not exists idx_contacts_user on contacts(user_id);
create index if not exists idx_dogs_user on dogs(user_id);
create index if not exists idx_services_user on services(user_id);
create index if not exists idx_events_user on events(user_id);
create index if not exists idx_templates_user on templates(user_id);
create index if not exists idx_contacts_updated on contacts(updated_at);
create index if not exists idx_dogs_updated on dogs(updated_at);
create index if not exists idx_services_updated on services(updated_at);
create index if not exists idx_events_updated on events(updated_at);
create index if not exists idx_templates_updated on templates(updated_at);

-- RLS
alter table contacts enable row level security;
alter table dogs enable row level security;
alter table services enable row level security;
alter table events enable row level security;
alter table templates enable row level security;

-- Políticas: el usuario solo ve/modifica sus filas
-- Si ya existen, drop previo:
drop policy if exists "own rows" on contacts;
drop policy if exists "own rows" on dogs;
drop policy if exists "own rows" on services;
drop policy if exists "own rows" on events;
drop policy if exists "own rows" on templates;

create policy "own rows" on contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on dogs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_contacts_touch on contacts;
create trigger trg_contacts_touch before update on contacts for each row execute function touch_updated_at();
drop trigger if exists trg_dogs_touch on dogs;
create trigger trg_dogs_touch before update on dogs for each row execute function touch_updated_at();
drop trigger if exists trg_services_touch on services;
create trigger trg_services_touch before update on services for each row execute function touch_updated_at();
drop trigger if exists trg_events_touch on events;
create trigger trg_events_touch before update on events for each row execute function touch_updated_at();
drop trigger if exists trg_templates_touch on templates;
create trigger trg_templates_touch before update on templates for each row execute function touch_updated_at();


-- Grants para Data API (anon/authenticated) - necesario para rest/v1
grant usage on schema public to anon, authenticated;
grant all on table contacts to anon, authenticated;
grant all on table dogs to anon, authenticated;
grant all on table services to anon, authenticated;
grant all on table events to anon, authenticated;
grant all on table templates to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

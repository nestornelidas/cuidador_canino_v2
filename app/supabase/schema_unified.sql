-- ==============================================================================
-- CUIDADOR CANINO - ESQUEMA UNIFICADO DE SUPABASE (Plan Free / Pro)
-- ==============================================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Incluye:
-- 1. Tablas de datos cifrados: contacts, dogs, services, events, templates
-- 2. Tabla de configuración de usuario/negocio: app_config
-- 3. Tabla de salt criptográfico compartido: user_config
-- 4. Tabla de lápidas de borrado: sync_tombstones
-- 5. Tabla de PIN global para URL pública: app_pin
-- 6. RLS en todas las tablas (seguridad por auth.uid())
-- 7. Publicación en Supabase Realtime para sincronización instantánea por WebSocket
-- ==============================================================================

-- 1. TABLAS PRINCIPALES DE DATOS
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

-- 2. CONFIGURACIÓN DEL NEGOCIO / PREFERENCIAS
create table if not exists app_config (
  id text primary key, -- p. ej. 'config' o id de usuario
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- 3. ESTADO CRIPTOGRÁFICO COMPARTIDO (Salt PBKDF2 + verificación)
create table if not exists user_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  crypto_state jsonb not null,
  updated_at timestamptz not null default now()
);

-- 4. LÁPIDAS DE BORRADO (Propagación de deletes entre dispositivos)
create table if not exists sync_tombstones (
  id text primary key, -- table_name:record_id
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id text not null,
  deleted_at timestamptz not null default now()
);

-- 5. PIN DE ACCESO PÚBLICO (Para despliegues tipo Vercel)
create table if not exists app_pin (
  id int primary key default 1,
  pin_hash text not null,
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- ÍNDICES PARA RENDIMIENTO Y RLS
-- ==============================================================================
create index if not exists idx_contacts_user on contacts(user_id);
create index if not exists idx_dogs_user on dogs(user_id);
create index if not exists idx_services_user on services(user_id);
create index if not exists idx_events_user on events(user_id);
create index if not exists idx_templates_user on templates(user_id);
create index if not exists idx_app_config_user on app_config(user_id);
create index if not exists idx_tomb_user on sync_tombstones(user_id);

create index if not exists idx_contacts_updated on contacts(updated_at);
create index if not exists idx_dogs_updated on dogs(updated_at);
create index if not exists idx_services_updated on services(updated_at);
create index if not exists idx_events_updated on events(updated_at);
create index if not exists idx_templates_updated on templates(updated_at);
create index if not exists idx_app_config_updated on app_config(updated_at);
create index if not exists idx_tomb_deleted on sync_tombstones(deleted_at);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table contacts enable row level security;
alter table dogs enable row level security;
alter table services enable row level security;
alter table events enable row level security;
alter table templates enable row level security;
alter table app_config enable row level security;
alter table user_config enable row level security;
alter table sync_tombstones enable row level security;
alter table app_pin enable row level security;

-- Políticas de usuario autenticado
drop policy if exists "own contacts" on contacts;
create policy "own contacts" on contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own dogs" on dogs;
create policy "own dogs" on dogs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own services" on services;
create policy "own services" on services for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own events" on events;
create policy "own events" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own templates" on templates;
create policy "own templates" on templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own app_config" on app_config;
create policy "own app_config" on app_config for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own user_config" on user_config;
create policy "own user_config" on user_config for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own sync_tombstones" on sync_tombstones;
create policy "own sync_tombstones" on sync_tombstones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pin read" on app_pin;
create policy "pin read" on app_pin for select to anon, authenticated using (true);

drop policy if exists "pin write" on app_pin;
create policy "pin write" on app_pin for all to authenticated using (true) with check (true);

-- ==============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ==============================================================================
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

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

drop trigger if exists trg_app_config_touch on app_config;
create trigger trg_app_config_touch before update on app_config for each row execute function touch_updated_at();

drop trigger if exists trg_user_config_touch on user_config;
create trigger trg_user_config_touch before update on user_config for each row execute function touch_updated_at();

drop trigger if exists trg_app_pin_touch on app_pin;
create trigger trg_app_pin_touch before update on app_pin for each row execute function touch_updated_at();

-- ==============================================================================
-- PERMISOS (GRANTS)
-- ==============================================================================
grant usage on schema public to anon, authenticated;
grant select on table contacts, dogs, services, events, templates, app_config, user_config, sync_tombstones to authenticated;
grant insert, update, delete on table contacts, dogs, services, events, templates, app_config, user_config, sync_tombstones to authenticated;
grant select on table app_pin to anon, authenticated;
grant insert, update, delete on table app_pin to authenticated;

-- ==============================================================================
-- SUPABASE REALTIME (WebSockets instantáneos multidispositivo)
-- ==============================================================================
-- Activa la replicación en tiempo real para todas las tablas
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table contacts, dogs, services, events, templates, app_config, user_config, sync_tombstones;
  end if;
exception when others then
  -- Si alguna tabla ya estaba en la publicación, no detener
  null;
end $$;

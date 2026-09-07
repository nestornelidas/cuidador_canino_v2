-- Cuidador Canino - Lápidas de borrado (propaga deletes entre dispositivos)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- Sin esta tabla la app sigue sincronizando, pero los borrados hechos en un
-- dispositivo no se aplican en el otro (solo altas y ediciones).
create table if not exists sync_tombstones (
  id text primary key, -- table_name:record_id
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id text not null,
  deleted_at timestamptz not null default now()
);
create index if not exists idx_tomb_user on sync_tombstones(user_id);
create index if not exists idx_tomb_deleted on sync_tombstones(deleted_at);
alter table sync_tombstones enable row level security;
drop policy if exists "own tombs" on sync_tombstones;
create policy "own tombs" on sync_tombstones for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on table sync_tombstones to authenticated;

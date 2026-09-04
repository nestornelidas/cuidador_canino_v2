-- Fix cross-device descifrado: salt compartido por usuario
create table if not exists user_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  crypto_state jsonb not null,
  updated_at timestamptz default now()
);
alter table user_config enable row level security;
drop policy if exists "own config" on user_config;
create policy "own config" on user_config for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
grant all on table user_config to authenticated;

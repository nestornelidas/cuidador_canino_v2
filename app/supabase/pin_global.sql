-- PIN global para URL publica (lectura anon para ExtraGate antes de login)
create table if not exists app_pin (
  id int primary key,
  pin_hash text not null,
  updated_at timestamptz default now()
);
alter table app_pin enable row level security;
drop policy if exists "pin read" on app_pin;
create policy "pin read" on app_pin for select to anon, authenticated using (true);
drop policy if exists "pin write" on app_pin;
create policy "pin write" on app_pin for all to authenticated using (true) with check (true);
grant select on app_pin to anon, authenticated;
grant all on app_pin to authenticated;

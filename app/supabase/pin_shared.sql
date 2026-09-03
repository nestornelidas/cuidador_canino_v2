-- PIN compartido entre dispositivos
alter table user_config add column if not exists pin_hash text;

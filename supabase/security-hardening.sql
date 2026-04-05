-- Security hardening for Inventario IFMS
-- Apply after schema.sql in the Supabase SQL editor.

alter table public.funcionarios add column if not exists email text;
alter table public.funcionarios add column if not exists pin text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funcionarios_pin_format_chk'
  ) then
    alter table public.funcionarios
      add constraint funcionarios_pin_format_chk
      check (pin is null or pin ~ '^\d{4,6}$');
  end if;
end $$;

alter table public.funcionarios    enable row level security;
alter table public.patrimonios     enable row level security;
alter table public.scans           enable row level security;
alter table public.sem_patrimonio  enable row level security;

drop policy if exists funcionarios_select_anon on public.funcionarios;
create policy funcionarios_select_anon
  on public.funcionarios
  for select
  to anon, authenticated
  using (ativo = true);

drop policy if exists patrimonios_select_anon on public.patrimonios;
create policy patrimonios_select_anon
  on public.patrimonios
  for select
  to anon, authenticated
  using (true);

drop policy if exists scans_select_anon on public.scans;
create policy scans_select_anon
  on public.scans
  for select
  to anon, authenticated
  using (true);

drop policy if exists sem_patrimonio_select_anon on public.sem_patrimonio;
create policy sem_patrimonio_select_anon
  on public.sem_patrimonio
  for select
  to anon, authenticated
  using (true);

drop policy if exists storage_insert_fotos on storage.objects;
create policy storage_insert_fotos
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'sem-patrimonio'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and (storage.foldername(name))[1] = 'fotos'
  );

drop policy if exists storage_select_fotos on storage.objects;
create policy storage_select_fotos
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'sem-patrimonio');

create schema if not exists private;

create table if not exists private.rate_limits (
  ip text,
  ts timestamptz default now()
);

create index if not exists rate_limits_ip_ts_idx on private.rate_limits (ip, ts);

create or replace function private.check_rate_limit()
returns void
language plpgsql
security definer
as $$
declare
  req_ip text;
  req_count int;
begin
  req_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
  if req_ip is null then
    return;
  end if;

  select count(*) into req_count
  from private.rate_limits
  where ip = req_ip
    and ts > now() - interval '5 minutes';

  if req_count > 100 then
    raise exception 'Rate limit exceeded' using errcode = 'P0001';
  end if;

  insert into private.rate_limits (ip) values (req_ip);

  delete from private.rate_limits
  where ts < now() - interval '1 hour';
end;
$$;

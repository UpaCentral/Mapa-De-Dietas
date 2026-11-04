create extension if not exists pg_cron;

create table if not exists public.historico_pacientes (
  id uuid primary key default gen_random_uuid(),
  system_id text not null check (
    system_id in ('cabecalho', 'dietas', 'processo', 'sae')
  ),
  patient_key text not null,
  patient_name text not null,
  record_number text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  updated_by uuid not null references auth.users(id),
  unique (system_id, patient_key)
);

create index if not exists historico_pacientes_expiration_idx
  on public.historico_pacientes (expires_at);

create index if not exists historico_pacientes_system_updated_idx
  on public.historico_pacientes (system_id, updated_at desc);

create or replace function public.refresh_patient_history_expiration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  new.expires_at := pg_catalog.now() + interval '7 days';
  return new;
end;
$$;

drop trigger if exists refresh_patient_history_expiration
  on public.historico_pacientes;
create trigger refresh_patient_history_expiration
  before insert or update on public.historico_pacientes
  for each row
  execute function public.refresh_patient_history_expiration();

alter table public.historico_pacientes enable row level security;
revoke all on table public.historico_pacientes from anon, public;
grant select, insert, update, delete
  on table public.historico_pacientes to authenticated;

drop policy if exists "authorized users can read patient history"
  on public.historico_pacientes;
create policy "authorized users can read patient history"
  on public.historico_pacientes
  for select
  to authenticated
  using (
    expires_at > now()
    and exists (
      select 1
      from public.upa_authorized_users
      where user_id = auth.uid() and enabled
    )
  );

drop policy if exists "authorized users can insert patient history"
  on public.historico_pacientes;
create policy "authorized users can insert patient history"
  on public.historico_pacientes
  for insert
  to authenticated
  with check (
    updated_by = auth.uid()
    and exists (
      select 1
      from public.upa_authorized_users
      where user_id = auth.uid() and enabled
    )
  );

drop policy if exists "authorized users can update patient history"
  on public.historico_pacientes;
create policy "authorized users can update patient history"
  on public.historico_pacientes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.upa_authorized_users
      where user_id = auth.uid() and enabled
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1
      from public.upa_authorized_users
      where user_id = auth.uid() and enabled
    )
  );

drop policy if exists "authorized users can delete patient history"
  on public.historico_pacientes;
create policy "authorized users can delete patient history"
  on public.historico_pacientes
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.upa_authorized_users
      where user_id = auth.uid() and enabled
    )
  );

select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-expired-upa-patient-history';

select cron.schedule(
  'purge-expired-upa-patient-history',
  '0 * * * *',
  $job$delete from public.historico_pacientes where expires_at <= now()$job$
);

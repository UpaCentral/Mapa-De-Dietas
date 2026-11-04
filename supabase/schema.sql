create table if not exists public.upa_authorized_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true
);

alter table public.upa_authorized_users enable row level security;
alter table public.upa_authorized_users force row level security;
revoke all on table public.upa_authorized_users from anon, public;
grant select on table public.upa_authorized_users to authenticated;

drop policy if exists "users can verify their own access" on public.upa_authorized_users;
create policy "users can verify their own access"
  on public.upa_authorized_users
  for select
  to authenticated
  using (user_id = (select auth.uid()) and enabled);

create table if not exists public.cabecalho_paciente (
  id text primary key default 'shared' check (id = 'shared'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

create table if not exists public.mapa_dietas (
  id text primary key default 'shared' check (id = 'shared'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

create table if not exists public.processo_enfermagem (
  id text primary key default 'shared' check (id = 'shared'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

create table if not exists public.sae_enfermagem (
  id text primary key default 'shared' check (id = 'shared'),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cabecalho_paciente',
    'mapa_dietas',
    'processo_enfermagem',
    'sae_enfermagem'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, public', table_name);
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);

    execute format('drop policy if exists "authenticated users can read" on public.%I', table_name);
    execute format(
      'create policy "authorized users can read" on public.%I for select to authenticated using (exists (select 1 from public.upa_authorized_users where user_id = (select auth.uid()) and enabled))',
      table_name
    );

    execute format('drop policy if exists "authorized users can insert" on public.%I', table_name);
    execute format(
      'create policy "authorized users can insert" on public.%I for insert to authenticated with check ((select auth.uid()) = updated_by and exists (select 1 from public.upa_authorized_users where user_id = (select auth.uid()) and enabled))',
      table_name
    );

    execute format('drop policy if exists "authorized users can update" on public.%I', table_name);
    execute format(
      'create policy "authorized users can update" on public.%I for update to authenticated using (exists (select 1 from public.upa_authorized_users where user_id = (select auth.uid()) and enabled)) with check ((select auth.uid()) = updated_by and exists (select 1 from public.upa_authorized_users where user_id = (select auth.uid()) and enabled))',
      table_name
    );
  end loop;
end
$$;

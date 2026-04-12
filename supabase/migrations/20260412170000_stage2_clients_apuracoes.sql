begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'apuracao_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.apuracao_status as enum (
      'draft',
      'files_uploaded',
      'processing',
      'reviewing',
      'finalized',
      'excel_generated',
      'archived'
    );
  end if;
end
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  whatsapp text not null,
  cpf text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.apuracoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  status public.apuracao_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_created_at_idx on public.clients(created_at desc);
create index if not exists clients_full_name_idx on public.clients(full_name);
create index if not exists apuracoes_user_id_idx on public.apuracoes(user_id);
create index if not exists apuracoes_client_id_idx on public.apuracoes(client_id);
create index if not exists apuracoes_status_idx on public.apuracoes(status);
create index if not exists apuracoes_created_at_idx on public.apuracoes(created_at desc);

drop trigger if exists clients_touch_updated_at on public.clients;
create trigger clients_touch_updated_at
before update on public.clients
for each row
execute function public.touch_updated_at();

drop trigger if exists apuracoes_touch_updated_at on public.apuracoes;
create trigger apuracoes_touch_updated_at
before update on public.apuracoes
for each row
execute function public.touch_updated_at();

create or replace function public.can_access_owned_record(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner_id = auth.uid() or public.is_super_admin();
$$;

alter table public.clients enable row level security;
alter table public.apuracoes enable row level security;

drop policy if exists "clients_select_owned" on public.clients;
create policy "clients_select_owned"
on public.clients
for select
to authenticated
using (public.can_access_owned_record(user_id));

drop policy if exists "clients_insert_owned" on public.clients;
create policy "clients_insert_owned"
on public.clients
for insert
to authenticated
with check (auth.uid() = user_id or public.is_super_admin());

drop policy if exists "clients_update_owned" on public.clients;
create policy "clients_update_owned"
on public.clients
for update
to authenticated
using (public.can_access_owned_record(user_id))
with check (public.can_access_owned_record(user_id));

drop policy if exists "clients_delete_owned" on public.clients;
create policy "clients_delete_owned"
on public.clients
for delete
to authenticated
using (public.can_access_owned_record(user_id));

drop policy if exists "apuracoes_select_owned" on public.apuracoes;
create policy "apuracoes_select_owned"
on public.apuracoes
for select
to authenticated
using (public.can_access_owned_record(user_id));

drop policy if exists "apuracoes_insert_owned" on public.apuracoes;
create policy "apuracoes_insert_owned"
on public.apuracoes
for insert
to authenticated
with check (
  (auth.uid() = user_id or public.is_super_admin())
  and exists (
    select 1
    from public.clients
    where public.clients.id = client_id
      and public.can_access_owned_record(public.clients.user_id)
  )
);

drop policy if exists "apuracoes_update_owned" on public.apuracoes;
create policy "apuracoes_update_owned"
on public.apuracoes
for update
to authenticated
using (public.can_access_owned_record(user_id))
with check (public.can_access_owned_record(user_id));

drop policy if exists "apuracoes_delete_owned" on public.apuracoes;
create policy "apuracoes_delete_owned"
on public.apuracoes
for delete
to authenticated
using (public.can_access_owned_record(user_id));

commit;

begin;

create table if not exists public.excel_templates (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references public.users(id) on delete set null,
  file_name text not null,
  original_file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null,
  version_number integer not null,
  is_active boolean not null default true,
  mapping_config jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.generated_excels (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  template_id uuid references public.excel_templates(id) on delete set null,
  generated_by uuid references public.users(id) on delete set null,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  template_version integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists excel_templates_version_number_idx
  on public.excel_templates(version_number desc);
create index if not exists excel_templates_is_active_idx
  on public.excel_templates(is_active);
create index if not exists generated_excels_apuracao_id_idx
  on public.generated_excels(apuracao_id);
create index if not exists generated_excels_created_at_idx
  on public.generated_excels(created_at desc);

drop trigger if exists excel_templates_touch_updated_at on public.excel_templates;
create trigger excel_templates_touch_updated_at
before update on public.excel_templates
for each row
execute function public.touch_updated_at();

alter table public.excel_templates enable row level security;
alter table public.generated_excels enable row level security;

drop policy if exists "excel_templates_select_authenticated" on public.excel_templates;
create policy "excel_templates_select_authenticated"
on public.excel_templates
for select
to authenticated
using (true);

drop policy if exists "excel_templates_insert_super_admin" on public.excel_templates;
create policy "excel_templates_insert_super_admin"
on public.excel_templates
for insert
to authenticated
with check (public.is_super_admin());

drop policy if exists "excel_templates_update_super_admin" on public.excel_templates;
create policy "excel_templates_update_super_admin"
on public.excel_templates
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "generated_excels_select_owned" on public.generated_excels;
create policy "generated_excels_select_owned"
on public.generated_excels
for select
to authenticated
using (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
  or public.is_super_admin()
);

drop policy if exists "generated_excels_insert_owned" on public.generated_excels;
create policy "generated_excels_insert_owned"
on public.generated_excels
for insert
to authenticated
with check (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
  or public.is_super_admin()
);

commit;

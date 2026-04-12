begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'statement_file_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.statement_file_status as enum (
      'uploaded',
      'processing',
      'processed',
      'failed'
    );
  end if;
end
$$;

create table if not exists public.statement_files (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  file_name text not null,
  original_file_name text not null,
  storage_bucket text not null default 'statement-files',
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null,
  processing_status public.statement_file_status not null default 'uploaded',
  detected_bank_name text,
  detected_account_label text,
  page_count integer,
  extracted_text text,
  processing_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.file_processing_logs (
  id uuid primary key default gen_random_uuid(),
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  stage text not null,
  status text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists statement_files_apuracao_id_idx on public.statement_files(apuracao_id);
create index if not exists statement_files_user_id_idx on public.statement_files(user_id);
create index if not exists statement_files_processing_status_idx on public.statement_files(processing_status);
create unique index if not exists statement_files_storage_path_uidx on public.statement_files(storage_path);
create index if not exists file_processing_logs_statement_file_id_idx on public.file_processing_logs(statement_file_id);
create index if not exists file_processing_logs_created_at_idx on public.file_processing_logs(created_at desc);

drop trigger if exists statement_files_touch_updated_at on public.statement_files;
create trigger statement_files_touch_updated_at
before update on public.statement_files
for each row
execute function public.touch_updated_at();

alter table public.statement_files enable row level security;
alter table public.file_processing_logs enable row level security;

drop policy if exists "statement_files_select_owned" on public.statement_files;
create policy "statement_files_select_owned"
on public.statement_files
for select
to authenticated
using (public.can_access_owned_record(user_id));

drop policy if exists "statement_files_insert_owned" on public.statement_files;
create policy "statement_files_insert_owned"
on public.statement_files
for insert
to authenticated
with check (
  (auth.uid() = user_id or public.is_super_admin())
  and exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "statement_files_update_owned" on public.statement_files;
create policy "statement_files_update_owned"
on public.statement_files
for update
to authenticated
using (public.can_access_owned_record(user_id))
with check (public.can_access_owned_record(user_id));

drop policy if exists "statement_files_delete_owned" on public.statement_files;
create policy "statement_files_delete_owned"
on public.statement_files
for delete
to authenticated
using (public.can_access_owned_record(user_id));

drop policy if exists "file_processing_logs_select_owned" on public.file_processing_logs;
create policy "file_processing_logs_select_owned"
on public.file_processing_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.statement_files
    where public.statement_files.id = statement_file_id
      and public.can_access_owned_record(public.statement_files.user_id)
  )
);

drop policy if exists "file_processing_logs_insert_owned" on public.file_processing_logs;
create policy "file_processing_logs_insert_owned"
on public.file_processing_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.statement_files
    where public.statement_files.id = statement_file_id
      and public.can_access_owned_record(public.statement_files.user_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'statement-files',
  'statement-files',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

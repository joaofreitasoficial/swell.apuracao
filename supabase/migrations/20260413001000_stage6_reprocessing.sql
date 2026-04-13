begin;

create table if not exists public.reprocessing_jobs (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('upload', 'retry', 'reupload')),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  inserted_count integer not null default 0,
  removed_count integer not null default 0,
  preserved_review_count integer not null default 0,
  pending_count integer not null default 0,
  duplicate_count integer not null default 0,
  diff_summary jsonb,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transaction_versions (
  id uuid primary key default gen_random_uuid(),
  reprocessing_job_id uuid not null references public.reprocessing_jobs(id) on delete cascade,
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  transaction_id uuid,
  transaction_hash text not null,
  version_kind text not null check (version_kind in ('previous', 'current')),
  review_was_preserved boolean not null default false,
  snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reprocessing_jobs_apuracao_id_idx
  on public.reprocessing_jobs(apuracao_id);
create index if not exists reprocessing_jobs_statement_file_id_idx
  on public.reprocessing_jobs(statement_file_id);
create index if not exists reprocessing_jobs_created_at_idx
  on public.reprocessing_jobs(created_at desc);
create index if not exists transaction_versions_reprocessing_job_id_idx
  on public.transaction_versions(reprocessing_job_id);
create index if not exists transaction_versions_apuracao_id_idx
  on public.transaction_versions(apuracao_id);
create index if not exists transaction_versions_statement_file_id_idx
  on public.transaction_versions(statement_file_id);
create index if not exists transaction_versions_transaction_hash_idx
  on public.transaction_versions(transaction_hash);

drop trigger if exists reprocessing_jobs_touch_updated_at on public.reprocessing_jobs;
create trigger reprocessing_jobs_touch_updated_at
before update on public.reprocessing_jobs
for each row
execute function public.touch_updated_at();

alter table public.reprocessing_jobs enable row level security;
alter table public.transaction_versions enable row level security;

drop policy if exists "reprocessing_jobs_select_owned" on public.reprocessing_jobs;
create policy "reprocessing_jobs_select_owned"
on public.reprocessing_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "reprocessing_jobs_insert_owned" on public.reprocessing_jobs;
create policy "reprocessing_jobs_insert_owned"
on public.reprocessing_jobs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "reprocessing_jobs_update_owned" on public.reprocessing_jobs;
create policy "reprocessing_jobs_update_owned"
on public.reprocessing_jobs
for update
to authenticated
using (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
)
with check (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "transaction_versions_select_owned" on public.transaction_versions;
create policy "transaction_versions_select_owned"
on public.transaction_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "transaction_versions_insert_owned" on public.transaction_versions;
create policy "transaction_versions_insert_owned"
on public.transaction_versions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

commit;

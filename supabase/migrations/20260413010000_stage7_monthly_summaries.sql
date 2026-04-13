begin;

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  month_ref integer not null check (month_ref between 1 and 12),
  year_ref integer not null,
  total_included numeric(14,2) not null default 0,
  entries_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (apuracao_id, month_ref, year_ref)
);

create table if not exists public.summary_snapshots (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  reference_key text not null,
  totals jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists monthly_summaries_apuracao_id_idx
  on public.monthly_summaries(apuracao_id);
create index if not exists monthly_summaries_year_month_idx
  on public.monthly_summaries(year_ref, month_ref);
create index if not exists summary_snapshots_apuracao_id_idx
  on public.summary_snapshots(apuracao_id);
create index if not exists summary_snapshots_created_at_idx
  on public.summary_snapshots(created_at desc);

drop trigger if exists monthly_summaries_touch_updated_at on public.monthly_summaries;
create trigger monthly_summaries_touch_updated_at
before update on public.monthly_summaries
for each row
execute function public.touch_updated_at();

alter table public.monthly_summaries enable row level security;
alter table public.summary_snapshots enable row level security;

drop policy if exists "monthly_summaries_select_owned" on public.monthly_summaries;
create policy "monthly_summaries_select_owned"
on public.monthly_summaries
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

drop policy if exists "monthly_summaries_insert_owned" on public.monthly_summaries;
create policy "monthly_summaries_insert_owned"
on public.monthly_summaries
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

drop policy if exists "monthly_summaries_update_owned" on public.monthly_summaries;
create policy "monthly_summaries_update_owned"
on public.monthly_summaries
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

drop policy if exists "monthly_summaries_delete_owned" on public.monthly_summaries;
create policy "monthly_summaries_delete_owned"
on public.monthly_summaries
for delete
to authenticated
using (
  exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "summary_snapshots_select_owned" on public.summary_snapshots;
create policy "summary_snapshots_select_owned"
on public.summary_snapshots
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

drop policy if exists "summary_snapshots_insert_owned" on public.summary_snapshots;
create policy "summary_snapshots_insert_owned"
on public.summary_snapshots
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

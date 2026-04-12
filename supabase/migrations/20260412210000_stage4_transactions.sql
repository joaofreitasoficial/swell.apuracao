begin;

create table if not exists public.raw_extractions (
  id uuid primary key default gen_random_uuid(),
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  extractor_kind text not null,
  model_name text,
  source_text text not null,
  raw_output jsonb,
  normalized_output jsonb,
  success boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  raw_extraction_id uuid references public.raw_extractions(id) on delete set null,
  bank_name text not null,
  account_label text,
  transaction_date date not null,
  description text not null,
  amount numeric(14,2) not null,
  direction text not null check (direction in ('credit', 'debit')),
  month_ref integer not null check (month_ref between 1 and 12),
  year_ref integer not null,
  extraction_confidence numeric(5,2) not null default 0.5,
  original_text text not null,
  transaction_hash text not null,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duplicate_checks (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references public.apuracoes(id) on delete cascade,
  statement_file_id uuid not null references public.statement_files(id) on delete cascade,
  transaction_hash text not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  matched_transaction_id uuid references public.transactions(id) on delete set null,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists raw_extractions_statement_file_id_idx on public.raw_extractions(statement_file_id);
create index if not exists transactions_apuracao_id_idx on public.transactions(apuracao_id);
create index if not exists transactions_statement_file_id_idx on public.transactions(statement_file_id);
create index if not exists transactions_transaction_date_idx on public.transactions(transaction_date desc);
create index if not exists transactions_direction_idx on public.transactions(direction);
create index if not exists transactions_transaction_hash_idx on public.transactions(transaction_hash);
create index if not exists duplicate_checks_apuracao_id_idx on public.duplicate_checks(apuracao_id);
create index if not exists duplicate_checks_statement_file_id_idx on public.duplicate_checks(statement_file_id);
create index if not exists duplicate_checks_transaction_hash_idx on public.duplicate_checks(transaction_hash);

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
before update on public.transactions
for each row
execute function public.touch_updated_at();

alter table public.raw_extractions enable row level security;
alter table public.transactions enable row level security;
alter table public.duplicate_checks enable row level security;

drop policy if exists "raw_extractions_select_owned" on public.raw_extractions;
create policy "raw_extractions_select_owned"
on public.raw_extractions
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

drop policy if exists "raw_extractions_insert_owned" on public.raw_extractions;
create policy "raw_extractions_insert_owned"
on public.raw_extractions
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

drop policy if exists "transactions_select_owned" on public.transactions;
create policy "transactions_select_owned"
on public.transactions
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

drop policy if exists "transactions_insert_owned" on public.transactions;
create policy "transactions_insert_owned"
on public.transactions
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

drop policy if exists "transactions_update_owned" on public.transactions;
create policy "transactions_update_owned"
on public.transactions
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

drop policy if exists "transactions_delete_owned" on public.transactions;
create policy "transactions_delete_owned"
on public.transactions
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

drop policy if exists "duplicate_checks_select_owned" on public.duplicate_checks;
create policy "duplicate_checks_select_owned"
on public.duplicate_checks
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

drop policy if exists "duplicate_checks_insert_owned" on public.duplicate_checks;
create policy "duplicate_checks_insert_owned"
on public.duplicate_checks
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

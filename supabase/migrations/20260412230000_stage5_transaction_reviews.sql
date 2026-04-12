begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'review_decision'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.review_decision as enum (
      'manter',
      'excluir',
      'pendente'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'exclusion_reason'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.exclusion_reason as enum (
      'transferencia_propria',
      'emprestimo',
      'estorno',
      'valor_eventual',
      'sem_comprovacao',
      'outro'
    );
  end if;
end
$$;

create table if not exists public.transaction_reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  decision public.review_decision not null default 'pendente',
  exclusion_reason public.exclusion_reason,
  review_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  apuracao_id uuid references public.apuracoes(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transaction_reviews_decision_idx on public.transaction_reviews(decision);
create index if not exists transaction_reviews_reviewed_by_idx on public.transaction_reviews(reviewed_by);
create index if not exists audit_logs_entity_type_entity_id_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_apuracao_id_idx on public.audit_logs(apuracao_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

drop trigger if exists transaction_reviews_touch_updated_at on public.transaction_reviews;
create trigger transaction_reviews_touch_updated_at
before update on public.transaction_reviews
for each row
execute function public.touch_updated_at();

alter table public.transaction_reviews enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "transaction_reviews_select_owned" on public.transaction_reviews;
create policy "transaction_reviews_select_owned"
on public.transaction_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.transactions
    join public.apuracoes on public.apuracoes.id = public.transactions.apuracao_id
    where public.transactions.id = transaction_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "transaction_reviews_insert_owned" on public.transaction_reviews;
create policy "transaction_reviews_insert_owned"
on public.transaction_reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.transactions
    join public.apuracoes on public.apuracoes.id = public.transactions.apuracao_id
    where public.transactions.id = transaction_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "transaction_reviews_update_owned" on public.transaction_reviews;
create policy "transaction_reviews_update_owned"
on public.transaction_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.transactions
    join public.apuracoes on public.apuracoes.id = public.transactions.apuracao_id
    where public.transactions.id = transaction_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
)
with check (
  exists (
    select 1
    from public.transactions
    join public.apuracoes on public.apuracoes.id = public.transactions.apuracao_id
    where public.transactions.id = transaction_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "audit_logs_select_owned" on public.audit_logs;
create policy "audit_logs_select_owned"
on public.audit_logs
for select
to authenticated
using (
  apuracao_id is not null and exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = audit_logs.apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

drop policy if exists "audit_logs_insert_owned" on public.audit_logs;
create policy "audit_logs_insert_owned"
on public.audit_logs
for insert
to authenticated
with check (
  apuracao_id is not null and exists (
    select 1
    from public.apuracoes
    where public.apuracoes.id = audit_logs.apuracao_id
      and public.can_access_owned_record(public.apuracoes.user_id)
  )
);

insert into public.transaction_reviews (
  transaction_id,
  decision,
  created_at,
  updated_at
)
select
  public.transactions.id,
  'pendente'::public.review_decision,
  timezone('utc', now()),
  timezone('utc', now())
from public.transactions
left join public.transaction_reviews
  on public.transaction_reviews.transaction_id = public.transactions.id
where public.transaction_reviews.id is null;

commit;

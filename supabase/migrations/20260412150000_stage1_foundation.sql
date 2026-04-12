begin;

create table if not exists public.roles (
  slug text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.roles (slug, label, description)
values
  ('super_admin', 'Super Admin', 'Administra usuários, acessos e configurações globais.'),
  ('user', 'Usuário', 'Opera clientes e apurações.')
on conflict (slug) do update
set
  label = excluded.label,
  description = excluded.description;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_slug text not null references public.roles(slug) default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists users_role_slug_idx on public.users(role_slug);
create index if not exists users_is_active_idx on public.users(is_active);

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row
execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role_slug, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'user',
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;

  return new;
end;
$$;

create or replace function public.handle_updated_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email = coalesce(new.email, public.users.email),
    full_name = coalesce(new.raw_user_meta_data ->> 'full_name', public.users.full_name),
    updated_at = timezone('utc', now())
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row
execute function public.handle_updated_auth_user();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role_slug = 'super_admin'
      and is_active = true
  );
$$;

alter table public.roles enable row level security;
alter table public.users enable row level security;

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users_select_super_admin" on public.users;
create policy "users_select_super_admin"
on public.users
for select
to authenticated
using (public.is_super_admin());

drop policy if exists "users_update_super_admin" on public.users;
create policy "users_update_super_admin"
on public.users
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "users_insert_super_admin" on public.users;
create policy "users_insert_super_admin"
on public.users
for insert
to authenticated
with check (public.is_super_admin());

commit;

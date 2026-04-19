create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, user_id)
);

create table if not exists public.freezers (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

create table if not exists public.drawers (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  freezer_id uuid not null references public.freezers (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  color text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

create table if not exists public.items (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  drawer_id uuid not null references public.drawers (id) on delete cascade,
  name text not null,
  quantity integer not null,
  unit text not null,
  tags text[] not null default '{}',
  notes text not null default '',
  date_added timestamptz not null,
  updated_at timestamptz not null,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

create table if not exists public.tags (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  updated_by uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  deleted_at timestamptz
);

create table if not exists public.sync_conflicts (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  entity_type text not null check (entity_type in ('freezers', 'drawers', 'items', 'tags')),
  entity_id uuid not null,
  local_payload jsonb not null,
  remote_payload jsonb not null,
  winner_source text not null check (winner_source in ('local', 'remote')),
  detected_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_household_members_user_id on public.household_members (user_id);
create index if not exists idx_freezers_household_id on public.freezers (household_id);
create index if not exists idx_drawers_household_id on public.drawers (household_id);
create index if not exists idx_items_household_id on public.items (household_id);
create index if not exists idx_tags_household_id on public.tags (household_id);
create index if not exists idx_sync_conflicts_household_id on public.sync_conflicts (household_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.freezers enable row level security;
alter table public.drawers enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.sync_conflicts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "households_select_member" on public.households;
create policy "households_select_member"
on public.households
for select
using (public.is_household_member(id));

drop policy if exists "household_members_select_own" on public.household_members;
create policy "household_members_select_own"
on public.household_members
for select
using (auth.uid() = user_id);

drop policy if exists "freezers_member_access" on public.freezers;
create policy "freezers_member_access"
on public.freezers
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "drawers_member_access" on public.drawers;
create policy "drawers_member_access"
on public.drawers
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "items_member_access" on public.items;
create policy "items_member_access"
on public.items
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "tags_member_access" on public.tags;
create policy "tags_member_access"
on public.tags
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "sync_conflicts_member_access" on public.sync_conflicts;
create policy "sync_conflicts_member_access"
on public.sync_conflicts
for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

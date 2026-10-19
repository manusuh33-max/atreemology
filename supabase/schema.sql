-- Atreemology backend schema (Supabase / Postgres).
-- Safe to read: it contains no secrets. What protects the data is the
-- row-level security below, not secrecy of this file.

-- ============ progress: one JSON document per signed-in learner ============
create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null check (pg_column_size(state) < 1000000),
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;

create policy progress_select_own on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy progress_insert_own on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy progress_update_own on public.progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy progress_delete_own on public.progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
create trigger progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();

-- ============ packs: the public catalogue (never holds paid content) ============
create table public.packs (
  id text primary key,
  title text not null,
  description text not null default '',
  sort int not null default 0,
  published boolean not null default false,
  is_bundle boolean not null default false,
  price_inr_paise int check (price_inr_paise is null or price_inr_paise > 0),
  price_usd_cents int check (price_usd_cents is null or price_usd_cents > 0),
  root_count int not null default 0,
  version int not null default 1,
  preview jsonb not null default '[]'::jsonb,   -- ["vert·vers", "mal·bene", ...] root names shown as chips on locked cards
  sample jsonb                                  -- optional ONE free root (same format as pack content)
);
alter table public.packs enable row level security;
create policy packs_read_published on public.packs for select to anon, authenticated
  using (published);

-- ============ pack_content: the paid roots and words ============
-- RLS is on with NO policies, so the API can never read this table directly.
-- The only way in is get_pack_content() below, which checks ownership.
create table public.pack_content (
  pack_id text primary key references public.packs (id) on delete cascade,
  content jsonb not null
);
alter table public.pack_content enable row level security;
revoke all on public.pack_content from anon, authenticated;

-- ============ entitlements: which packs each learner owns ============
-- Learners can read their own rows. Nobody can write them from the app:
-- only the payment functions (using the service role) add rows.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,   -- payment record is kept if the account is deleted
  pack text not null references public.packs (id),
  source text not null default 'razorpay',
  payment_id text not null unique,
  amount int,
  currency text,
  created_at timestamptz not null default now()
);
create index entitlements_user_idx on public.entitlements (user_id);
alter table public.entitlements enable row level security;
create policy entitlements_select_own on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke all on public.entitlements from anon;

-- ============ payment_orders: server-side record of each checkout ============
create table public.payment_orders (
  order_id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  pack text not null references public.packs (id),
  amount int not null,
  currency text not null,
  status text not null default 'created' check (status in ('created', 'paid')),
  created_at timestamptz not null default now()
);
alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;

-- ============ functions the app may call ============
create function public.get_pack_content(p_pack text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.entitlements e
    where e.user_id = uid and e.pack in (p_pack, 'all-access')
  ) then
    raise exception 'not entitled' using errcode = '42501';
  end if;
  select pc.content into result
  from public.pack_content pc
  join public.packs p on p.id = pc.pack_id
  where pc.pack_id = p_pack and p.published and not p.is_bundle;
  return result;
end $$;
revoke execute on function public.get_pack_content(text) from public, anon;
grant execute on function public.get_pack_content(text) to authenticated;

-- Account deletion is handled by the delete-account Edge Function (it uses the
-- auth admin API), so there is no SQL function that touches the auth schema.

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- ============ least-privilege grants (applied as migration "tighten_table_grants") ============
-- Row-level security already limits rows; this also removes privileges the app never needs.
revoke all on public.packs from anon, authenticated;
grant select on public.packs to anon, authenticated;
revoke all on public.progress from anon, authenticated;
grant select, insert, update, delete on public.progress to authenticated;
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

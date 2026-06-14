-- Tramea — migration initiale (auth/profils + programmes)
-- À appliquer dans Supabase : SQL Editor (copier-coller) OU `supabase db push`.
-- Sécurité : RLS activée partout, deny-by-default.

-- ════════════════════════════════════════════════════════════════════════════
-- 1) PROFILS (un par utilisateur : statut + rôle)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        text check (role in ('basic', 'advanced', 'admin')),
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'suspended')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- is_admin (SECURITY DEFINER → évite la récursion RLS).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin' and status = 'approved'
  );
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "admin reads all" on public.profiles;
create policy "admin reads all" on public.profiles
  for select using (public.is_admin(auth.uid()));

drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
-- (Pas d'INSERT/UPDATE pour l'utilisateur : il ne peut pas s'auto-approuver.)

-- Création automatique du profil (pending) à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, status)
  values (new.id, new.email, 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- 2) PROGRAMMES (sauvegarde cloud — le JSON complet du programme/trame)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.programmes (
  id          uuid primary key,                 -- id généré côté app
  owner_id    uuid not null references auth.users (id) on delete cascade,
  titre       text not null default '',
  date        text not null default '',         -- yyyy-mm-dd
  data        jsonb not null,                   -- Programme complet (sections/items)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists programmes_owner_idx on public.programmes (owner_id);
create index if not exists programmes_updated_idx on public.programmes (updated_at desc);

alter table public.programmes enable row level security;

-- Le propriétaire gère ses programmes ; un admin peut tout lire.
drop policy if exists "owner reads own programmes" on public.programmes;
create policy "owner reads own programmes" on public.programmes
  for select using (auth.uid() = owner_id or public.is_admin(auth.uid()));

drop policy if exists "owner inserts own programmes" on public.programmes;
create policy "owner inserts own programmes" on public.programmes
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owner updates own programmes" on public.programmes;
create policy "owner updates own programmes" on public.programmes
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner deletes own programmes" on public.programmes;
create policy "owner deletes own programmes" on public.programmes
  for delete using (auth.uid() = owner_id);

-- Met à jour updated_at automatiquement.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists programmes_touch on public.programmes;
create trigger programmes_touch
  before update on public.programmes
  for each row execute function public.touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 3) Bootstrap du 1er admin (après sa 1re connexion par lien magique) :
--    update public.profiles set role = 'admin', status = 'approved'
--    where email = 'ton-email@exemple.org';
-- ════════════════════════════════════════════════════════════════════════════

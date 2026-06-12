-- Tramea — schéma Supabase (auth + profils + rôles)
-- À exécuter dans l'éditeur SQL Supabase. Sécurité : deny-by-default via RLS.

-- 1) Table des profils : un profil par utilisateur, avec statut et rôle.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        text check (role in ('basic', 'advanced', 'admin')),
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'suspended')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) Fonction is_admin (SECURITY DEFINER → évite la récursion RLS).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'admin' and status = 'approved'
  );
$$;

-- 3) Politiques RLS.
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
-- (Aucune politique d'INSERT/UPDATE pour l'utilisateur : il ne peut pas
--  s'auto-approuver ni changer son rôle. Seul un admin le peut.)

-- 4) Création automatique du profil (status 'pending') à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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

-- 5) Bootstrap du premier administrateur (après sa 1re connexion par lien magique) :
--    update public.profiles set role = 'admin', status = 'approved'
--    where email = 'admin@exemple.org';

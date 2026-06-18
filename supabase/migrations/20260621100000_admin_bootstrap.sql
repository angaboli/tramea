-- Tramea — bootstrap des admins (data-driven).
-- But : éviter le « 1er admin » via SQL à deviner. On déclare des emails admin
-- dans une table ; à l'inscription, le profil correspondant est créé DIRECTEMENT
-- en admin/approved. Sécurité conservée : l'utilisateur ne peut pas s'auto-
-- promouvoir (table protégée par RLS, modifiable seulement par un admin existant).

-- ════════════════════════════════════════════════════════════════════════════
-- 1) Liste des emails admin (allowlist)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;

-- Seul un admin approuvé peut lire/gérer l'allowlist (deny-by-default sinon).
drop policy if exists "admin reads allowlist" on public.admin_emails;
create policy "admin reads allowlist" on public.admin_emails
  for select using (public.is_admin(auth.uid()));

drop policy if exists "admin manages allowlist" on public.admin_emails;
create policy "admin manages allowlist" on public.admin_emails
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- 2) Création de profil à l'inscription : admin/approved si l'email est listé,
--    sinon pending (comportement par défaut inchangé).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  is_seed_admin boolean;
begin
  select exists (select 1 from public.admin_emails where lower(email) = lower(new.email))
    into is_seed_admin;

  insert into public.profiles (id, email, role, status)
  values (
    new.id,
    new.email,
    case when is_seed_admin then 'admin' else null end,
    case when is_seed_admin then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3) Bootstrap : déclarez ici vos emails admin, PUIS exécutez ce bloc.
--    (Remplacez l'adresse ; ajoutez-en autant que nécessaire.)
-- ════════════════════════════════════════════════════════════════════════════
-- insert into public.admin_emails (email) values ('admin@votre-eglise.org')
--   on conflict (email) do nothing;

-- Promotion des comptes DÉJÀ inscrits dont l'email est dans l'allowlist
-- (le trigger ci-dessus ne s'applique qu'aux NOUVELLES inscriptions).
update public.profiles p
set role = 'admin', status = 'approved'
where exists (
  select 1 from public.admin_emails a where lower(a.email) = lower(p.email)
);

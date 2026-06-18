-- Tramea — rôle par défaut = 'basic'.
-- But : ne plus jamais avoir de compte « approuvé sans rôle » (écran « Rôle non
-- attribué »). Tout profil reçoit le rôle 'basic' par défaut ; un admin peut
-- ensuite le passer en 'advanced' ou 'admin'. L'accès reste gated par `status`
-- (pending tant qu'un admin n'a pas approuvé).

-- 1) Valeur par défaut de la colonne.
alter table public.profiles alter column role set default 'basic';

-- 2) Création de profil à l'inscription : 'admin'/approved si email listé dans
--    admin_emails, sinon 'basic'/pending (au lieu de role NULL).
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
    case when is_seed_admin then 'admin' else 'basic' end,
    case when is_seed_admin then 'approved' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) Rattrapage : tout profil sans rôle reçoit 'basic'.
update public.profiles set role = 'basic' where role is null;

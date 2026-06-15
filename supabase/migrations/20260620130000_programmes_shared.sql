-- Tramea — programmes/trames en mode PARTAGÉ (temporaire).
-- Contexte : l'auth est désactivée (VITE_AUTH_DISABLED). On veut que les trames
-- soient gardées sur le serveur et visibles par tous, « peu importe qui les a
-- créées ». On ouvre donc la table `programmes` à l'accès ANONYME (clé publique).
-- À durcir (par owner_id) quand l'auth sera réactivée.

-- owner_id n'est plus obligatoire (pas de session en mode partagé).
alter table public.programmes
  alter column owner_id drop not null;

-- On retire les politiques par-propriétaire…
drop policy if exists "owner reads own programmes"    on public.programmes;
drop policy if exists "owner inserts own programmes"   on public.programmes;
drop policy if exists "owner updates own programmes"   on public.programmes;
drop policy if exists "owner deletes own programmes"   on public.programmes;

-- …au profit d'un accès partagé (rôles anon + authenticated).
drop policy if exists "shared read programmes"   on public.programmes;
create policy "shared read programmes" on public.programmes
  for select to anon, authenticated using (true);

drop policy if exists "shared insert programmes" on public.programmes;
create policy "shared insert programmes" on public.programmes
  for insert to anon, authenticated with check (true);

drop policy if exists "shared update programmes" on public.programmes;
create policy "shared update programmes" on public.programmes
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "shared delete programmes" on public.programmes;
create policy "shared delete programmes" on public.programmes
  for delete to anon, authenticated using (true);

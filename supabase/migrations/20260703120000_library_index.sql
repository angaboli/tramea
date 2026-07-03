-- Tramea — index PARTAGÉ de la bibliothèque ProPresenter (noms de fichiers
-- .pro uniquement, pas les médias). But : permettre de chercher/lier un chant
-- depuis N'IMPORTE QUEL poste, sans reconnecter le dossier local à chaque
-- fois. Les vrais fichiers (.pro, médias) restent sur la machine qui a le
-- dossier ProPresenter, et sont résolus seulement à l'export.
--
-- Publication : quiconque a le dossier connecté peut cliquer « Publier la
-- bibliothèque » (remplace tout l'index). Mode PARTAGÉ (comme `programmes`)
-- tant que l'auth est en bypass ; à resserrer plus tard si besoin.
create table if not exists public.library_songs (
  name        text primary key,   -- nom de fichier .pro (basename), ex "Agnus Dei - JEM 724.pro"
  rel_path    text not null,      -- chemin relatif au dossier ProPresenter
  updated_at  timestamptz not null default now()
);

create index if not exists library_songs_updated_idx on public.library_songs (updated_at desc);

alter table public.library_songs enable row level security;

drop policy if exists "shared read library_songs" on public.library_songs;
create policy "shared read library_songs" on public.library_songs
  for select to anon, authenticated using (true);

drop policy if exists "shared insert library_songs" on public.library_songs;
create policy "shared insert library_songs" on public.library_songs
  for insert to anon, authenticated with check (true);

drop policy if exists "shared update library_songs" on public.library_songs;
create policy "shared update library_songs" on public.library_songs
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "shared delete library_songs" on public.library_songs;
create policy "shared delete library_songs" on public.library_songs
  for delete to anon, authenticated using (true);

# Tramea

Application web (PWA) pour **créer** les trames de culte ProPresenter et les
exporter en **`.proPlaylist`** (import direct dans ProPresenter 7) et en **PDF**
(feuille de culte).

- 100% navigateur (offline), le dossier ProPresenter reste en local.
- Auth par lien magique (Supabase), accès restreint par rôles.
- Données nées structurées en JSON → exports fiables, sans extraction PDF.

## Documentation

- 📋 [Plan & spécifications](docs/plan.md) — vision, architecture, stack, modèle
  de données, format `.proPlaylist`, sprints et versions.

## Stack

Vite · React · TypeScript · Tailwind · Zustand · vite-plugin-pwa ·
fflate (zip) · pdf-lib (PDF) · Supabase (auth + données).

## État

🚧 En cours de démarrage — voir la roadmap dans [docs/plan.md](docs/plan.md).

# Tramea

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-2D3748)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-auth-3FCF8E?logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-103%20tests-6E9F18?logo=vitest&logoColor=white)
![pdf-lib](https://img.shields.io/badge/pdf--lib-PDF-EC4899)
![fflate](https://img.shields.io/badge/fflate-zip-555555)

Application web (PWA) pour **créer** les trames de culte ProPresenter et les
exporter en **`.proPlaylist`** (import direct dans ProPresenter 7) et en **PDF**
(feuille de culte).

- 100% navigateur (offline), le dossier ProPresenter reste **en local**.
- Auth par **lien magique** (Supabase), accès restreint par **rôles** (deny-by-default).
- Données nées structurées en JSON → exports fiables, sans extraction PDF fragile.

## Commandes (pnpm)

```bash
pnpm install       # installer les dépendances
pnpm dev           # serveur de dev
pnpm test          # tests (watch)
pnpm test:run      # tests (une passe)
pnpm test:cov      # tests + couverture
pnpm typecheck     # vérification de types
pnpm build         # build de production
```

## Documentation

- 📋 [Plan & spécifications](docs/plan.md) — vision, architecture, modèle de
  données, format `.proPlaylist`, sprints et versions.
- 🎨 [Design system](docs/design.md) — tokens, thèmes, composants.
- 🏛️ [Architecture & conventions](docs/architecture.md) — couches, SOLID, TDD.
- 🚀 [Déploiement (Vercel)](docs/deploy.md) · 🔐 [Supabase](docs/supabase.md)

## Stack

Vite · React · TypeScript · Tailwind · Zustand · vite-plugin-pwa ·
fflate (zip) · pdf-lib (PDF) · idb-keyval (IndexedDB) · Supabase (auth + données).

## Structure (Clean Architecture)

```
src/
├── domain/         # règles métier PURES (Programme, Trame, auth, biblio) — testées
├── application/    # cas d'usage (export .proPlaylist…)
├── infrastructure/ # adapters : proplaylist (protobuf+zip), fs, pdf, supabase, persistence
├── ui/
│   ├── components/ # design system + dialogs
│   ├── screens/    # login, dashboard Creator, éditeurs, admin
│   ├── stores/     # Zustand (session, theme, éditeur, bibliothèque…)
│   └── lib/        # utilitaires (autosave, download…)
├── styles/tokens.css  # tokens de marque (clair + sombre)
docs/   · design/ · supabase/   (documentation, handoff design, schéma SQL)
```

## Authentification (garde d'accès)

À la visite du site, on tombe **toujours sur la page de connexion** (lien magique).
Deny-by-default : un nouvel utilisateur est `pending` → écran d'attente jusqu'à
l'approbation d'un **admin**. Sans Supabase configuré, un **adapter local** (dev)
prend le relais ; définir `VITE_ADMIN_EMAIL` (voir `.env.example`) pour un accès
admin de démo. Voir [docs/supabase.md](docs/supabase.md) pour l'auth réelle.

## État

Flux complet de bout en bout : connexion → dashboard → éditer un **programme**
(chants depuis la bibliothèque ProPresenter, moments récurrents) → exporter en
**PDF** et en **`.proPlaylist`** (médias inclus), avec sauvegarde automatique,
duplication, import PDF/MD, et **PWA installable / hors-ligne**.

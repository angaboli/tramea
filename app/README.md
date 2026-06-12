# Tramea — App (PWA)

Front Vite + React + TypeScript + Tailwind, suivant le **design system Tramea**
(`../docs/design.md`) et l'**architecture clean** (`../docs/architecture.md`).

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

## Authentification (garde d'accès)
À la visite du site, on tombe **toujours sur la page de connexion** (lien magique).
Deny-by-default : un nouvel utilisateur est `pending` → écran d'attente jusqu'à
l'approbation d'un admin. L'adapter actuel est **local** (dev) ; le réel Supabase
se branchera sur le même `AuthPort` sans changer la garde ni les écrans.
Définir `VITE_ADMIN_EMAIL` (voir `.env.example`) pour un accès admin de démo.

## Structure (Clean Architecture)

```
src/
├── domain/        # règles métier pures (Programme/Trame) — testées, sans dépendance
├── application/   # cas d'usage (à venir)
├── infrastructure/# adapters (proPlaylist, fs, supabase…) (à venir)
├── ui/
│   ├── components/ # design system : Button, Card, Badge, Input, ThemeToggle
│   └── stores/     # Zustand (theme…)
├── styles/
│   └── tokens.css  # TOUS les tokens de marque (clair + sombre)
└── test/setup.ts   # config Vitest + jest-dom
```

## Design system
- Tokens en variables CSS (`src/styles/tokens.css`), thème via `data-theme` sur `<html>`.
- Tailwind mappe les tokens (`tailwind.config.js`) — **aucune couleur en dur**.
- Polices : Hanken Grotesk (UI) + JetBrains Mono (mono), chargées dans `index.html`.
- Clair / sombre via le store `useTheme`.

## État
✅ Fondations posées : tokens, thème clair/sombre, composants de base, domaine
testé (TDD), build + tests verts. Voir la roadmap dans `../docs/plan.md`.

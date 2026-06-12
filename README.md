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

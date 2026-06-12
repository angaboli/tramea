# Tramea — Déploiement (Vercel)

L'app est à la **racine** du dépôt.

## Réglages du projet Vercel
- **Root Directory** : `.` (racine — réglage par défaut)
- **Framework Preset** : Vite
- **Install Command** : `pnpm install`
- **Build Command** : `pnpm build`
- **Output Directory** : `dist`
- Activer **pnpm** (Vercel le détecte via `pnpm-lock.yaml`).

Le fichier `vercel.json` réécrit toutes les routes vers `index.html`
(**fallback SPA**) — indispensable pour React Router (`/creator`, `/programme`,
`/admin`) et les liens profonds.

## Variables d'environnement (Project Settings → Environment Variables)
À renseigner pour activer l'auth réelle (sinon mode dev local) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Voir `docs/supabase.md`. Penser à ajouter l'URL Vercel (prod + previews) dans les
**Redirect URLs** de Supabase (le lien magique redirige vers l'origine).

## PWA
Le build émet le service worker et le manifest : l'app est **installable** depuis
l'URL Vercel et fonctionne **hors-ligne** après la première visite.

## Notes
- Les fichiers ProPresenter ne quittent jamais le poste (File System Access,
  côté navigateur) — rien à héberger côté serveur.

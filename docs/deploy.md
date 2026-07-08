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

## Rollback (revenir à un état prod antérieur)

Avant chaque changement à risque sur `main` (ex. reskin visuel), on pose un
**tag git** sur le dernier commit prod stable AVANT le changement. Ça permet de
revenir en un clic si le nouveau déploiement pose problème, sans avoir à
retrouver le bon commit à la main.

### Tags de restauration existants
- `pre-stitch-design` — état prod juste avant le reskin visuel Stitch
  (typographie, sidebar, aperçu PDF temps réel…), posé le 8 juillet 2026.

### Revenir en arrière (deux façons)

**Option A — Rollback instantané via Vercel (recommandé, zéro risque git) :**
1. Dashboard Vercel → projet Tramea → onglet **Deployments**.
2. Trouver le déploiement de production juste avant le changement (correspond
   au tag ci-dessus, ou identifiable par sa date/heure).
3. Cliquer les `...` → **Promote to Production**.
4. C'est immédiat, ça ne touche pas l'historique git — on peut re-avancer
   ensuite si besoin.

**Option B — Revert git (si on veut que `main` corresponde réellement à
l'ancien état, ex. avant de repartir sur une autre base) :**
```bash
git checkout main
git reset --hard pre-stitch-design   # main = exactement l'état d'avant
git push origin main --force-with-lease
```
⚠️ `--force-with-lease` réécrit l'historique distant de `main` — à utiliser
seulement si personne d'autre n'a poussé de commits sur `main` entre-temps.
En cas de doute, préférer l'Option A (Vercel), réversible sans danger.

### Créer un nouveau point de restauration
Avant un futur changement risqué sur `main` :
```bash
git tag -a pre-<nom-du-changement> -m "Description courte" origin/main
git push origin pre-<nom-du-changement>
```

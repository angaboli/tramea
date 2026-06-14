# Tramea — Brancher Supabase (auth réelle)

Tant que Supabase n'est pas configuré, l'app utilise l'**adapter d'auth local**
(dev). Dès que les variables d'environnement sont présentes, elle bascule
**automatiquement** sur Supabase (lien magique réel) — sans changer le code UI.

## 1. Créer le projet
1. Créer un projet sur [supabase.com](https://supabase.com).
2. Récupérer dans *Project Settings → API* :
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` (jamais la clé *service*).

## 2. Appliquer les migrations
Les migrations vivent dans `supabase/migrations/` (versionnées, comme Prisma).

**Workflow recommandé — Supabase CLI** :
```bash
pnpm dlx supabase login                                  # ouvre le navigateur
pnpm dlx supabase link --project-ref rvjvpcldqztijkyhuknk # demande le mot de passe DB
pnpm dlx supabase db push                                # applique les migrations
```
**Changement de schéma plus tard** :
```bash
pnpm dlx supabase migration new mon_changement   # crée un fichier SQL daté
#   … on édite le SQL …
pnpm dlx supabase db push                          # applique
```

**Alternative one-shot (sans CLI)** : copier le contenu de
`supabase/migrations/0001…_init.sql` dans *SQL Editor* et l'exécuter.

La migration initiale crée : `profiles` (statut + rôle, RLS, `is_admin`, trigger
d'inscription) et `programmes` (sauvegarde cloud, RLS par propriétaire).

## 3. Configurer l'auth
- *Authentication → Providers → Email* : activer **Magic Link**.
- *Authentication → URL Configuration* : ajouter l'URL de l'app (dev + prod) aux
  **Redirect URLs** (l'app redirige vers `window.location.origin`).

## 4. Variables d'environnement
Copier `app/.env.example` en `app/.env` et renseigner :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Puis `pnpm dev` (ou rebuild). Le bouton « Continuer (démo) » disparaît : c'est le
vrai lien magique qui est utilisé.

## 5. Premier administrateur
1. Se connecter une première fois (lien magique) → un profil `pending` est créé.
2. Dans *SQL Editor* :
   ```sql
   update public.profiles
   set role = 'admin', status = 'approved'
   where email = 'votre-email@exemple.org';
   ```
3. Cet admin pourra ensuite approuver les autres comptes et attribuer les rôles
   (via le futur panneau d'administration, ou en SQL en attendant).

## Sécurité
- Clé **anon** seulement côté front ; la clé *service* ne doit jamais y figurer.
- **Deny-by-default** : un nouvel utilisateur n'a aucun accès tant qu'un admin ne
  l'a pas approuvé (vérifié côté UI **et** côté base par RLS).
- Aucune politique ne permet à un utilisateur de changer son propre rôle/statut.

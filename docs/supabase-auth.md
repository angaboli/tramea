# Configuration de l'authentification Supabase (Tramea)

Guide pour activer une auth **stable** : connexion par mot de passe et/ou lien
magique, comptes validés par un admin, sans les blocages rencontrés (429,
redirection `localhost`, « signup disabled »).

> Tant que tout n'est pas stable, l'app peut tourner **sans auth** via
> `VITE_AUTH_DISABLED=true` (accès admin direct). Voir la dernière section pour
> la lever.

## 1. Variables d'environnement (Vercel + `.env`)

```
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # clé publique (jamais la service)
VITE_ADMIN_EMAIL=admin@votre-eglise.org            # auth LOCALE de dev uniquement
VITE_AUTH_DISABLED=                                 # vide/false = auth active
```

En production (Supabase), les admins ne se définissent **pas** via
`VITE_ADMIN_EMAIL` mais par la table `admin_emails` (étape 4).

## 2. Appliquer les migrations

Dans Supabase → **SQL Editor**, exécuter dans l'ordre :
1. `supabase/migrations/20260620120000_init.sql` (profils + programmes + RLS)
2. `supabase/migrations/20260620130000_programmes_shared.sql` (trames partagées)
3. `supabase/migrations/20260621100000_admin_bootstrap.sql` (bootstrap admin)

Ou, si le projet est lié (`supabase link`) : `supabase db push`.

## 3. Réglages Authentication (les points qui bloquaient)

Dans **Authentication → ...** :

- **URL Configuration**
  - **Site URL** : `https://tramea.vercel.app` (PAS `localhost`).
  - **Redirect URLs** : ajouter `https://tramea.vercel.app/**`
    (et `http://localhost:5173/**` pour le dev local).
  - → corrige les liens magiques qui renvoyaient vers `localhost:3000`.
- **Providers → Email**
  - **Enable Email provider** : activé.
  - **Confirm email** : **désactivé** recommandé (validation faite par l'admin
    dans l'app). Si activé, l'utilisateur doit cliquer le lien email AVANT de
    pouvoir se connecter.
  - **Allow new users to sign up** : **activé** (sinon « signup disabled / 400 »).
- **Rate limits** (corrige les 429)
  - Le SMTP intégré de Supabase est très limité (quelques emails/heure).
  - Pour un usage réel : **configurer un SMTP** (Authentication → SMTP Settings)
    OU privilégier la **connexion par mot de passe** (pas d'email = pas de 429).

## 4. Déclarer le(s) admin(s)

Dans **SQL Editor** :

```sql
insert into public.admin_emails (email) values ('admin@votre-eglise.org')
  on conflict (email) do nothing;

-- promeut le compte s'il est déjà inscrit
update public.profiles p set role = 'admin', status = 'approved'
where exists (select 1 from public.admin_emails a where lower(a.email) = lower(p.email));
```

Ensuite, toute **nouvelle** inscription avec un email listé devient
automatiquement admin/approved. Les autres comptes arrivent en `pending` et sont
approuvés par un admin via l'écran **Utilisateurs** de l'app.

## 5. Lever le mode sans-auth

Une fois les étapes 1–4 validées :
- mettre `VITE_AUTH_DISABLED` à vide (ou `false`) dans Vercel,
- **redéployer**.

L'app exige alors une session Supabase valide (deny-by-default) ; les nouveaux
comptes restent en attente d'approbation admin.

## Dépannage rapide

| Symptôme | Cause | Correctif |
|---|---|---|
| 429 / « rate limit » | SMTP intégré saturé | SMTP perso, ou mot de passe |
| Lien magique → `localhost` | Site URL mal réglée | étape 3, URL Configuration |
| « signup disabled » / 400 | inscriptions désactivées | activer « Allow new users » |
| Connexion refusée après inscription | « Confirm email » activé | confirmer l'email, ou le désactiver |
| Admin reste « en attente » | email pas dans `admin_emails` | étape 4 |

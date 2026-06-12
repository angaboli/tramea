# Prompt de contexte — Tramea

## 🟢 Le contexte général

Imagine une église. Chaque samedi (le sabbat), il y a un programme : on chante des
chansons, quelqu'un souhaite la bienvenue, quelqu'un prie, quelqu'un raconte une
histoire aux enfants, etc. Ce programme s'appelle une **trame**.

Pendant le culte, les paroles des chansons et les titres sont affichés sur un grand
écran, grâce à un logiciel qui s'appelle **ProPresenter** (comme un grand
diaporama).

Aujourd'hui, une personne doit préparer ce programme **à la main** : taper la liste,
retrouver chaque chanson une par une, et tout remettre dans le logiciel. C'est long
et on fait des erreurs.

**Tramea**, c'est une application qui rend ça facile. On choisit les chansons et les
moments du programme dans l'application, comme on remplit une liste, et l'application
fabrique **toute seule** deux choses :

1. une **feuille papier** (le programme à imprimer) ;
2. un **fichier prêt à ouvrir dans ProPresenter** (pour l'afficher sur l'écran).

En résumé : **Tramea aide l'église à préparer le programme du culte en quelques
minutes au lieu de plusieurs heures.**

---

## 🔧 Le contexte technique

**Ce qu'est Tramea :** une application web installable (**PWA**) qui fonctionne dans
le navigateur, même **hors-ligne**. Elle sert à **créer** la trame de culte puis à
l'**exporter**.

**Idée clé :** au lieu d'importer un PDF déjà fait (fragile, mal encodé), on
**construit** la trame dans l'app. Les données naissent donc **structurées (JSON)**,
ce qui rend tout fiable : on pointe le bon fichier de chant exactement, sans devoir
le « deviner ».

**Deux exports, depuis le même JSON :**

- **PDF** — la feuille de culte (mise en page actuelle : colonnes titre, recueil,
  tonalité, officiant, note).
- **`.proPlaylist`** — une archive importable directement dans **ProPresenter 7**.
  C'est un **ZIP** contenant un fichier `data` (structure **protobuf**), les fichiers
  `.pro` de chaque chant, et les médias (`Media/`). Ce format a déjà été
  **rétro-conçu et validé** (un prototype Python génère un fichier identité-octet à
  l'export natif de ProPresenter).

**Accès au dossier ProPresenter :** via la **File System Access API** du navigateur
— l'utilisateur choisit son dossier ProPresenter local ; l'app y lit la liste des
chants (`.pro`) et les médias. **Aucun fichier ne quitte le poste.**

**Authentification :** **Supabase** (connexion par **lien magique** email) +
gestion d'**utilisateurs et rôles** (admin / éditeur / lecteur) avec approbation par
un admin. Sécurité par **Row Level Security**. Seules des métadonnées de trame (JSON)
peuvent être synchronisées plus tard ; jamais les fichiers ProPresenter.

**Stack :** Vite · React · TypeScript · Tailwind · Zustand · vite-plugin-pwa ·
fflate (zip) · pdf-lib (PDF) · Supabase. Pas de Next.js (app front pur ; pas de
backend lourd).

**Plateforme cible :** poste de régie sous Windows, navigateur Chromium
(Chrome/Edge), usage souvent hors-ligne.

**État d'avancement :** spécifications et format `.proPlaylist` validés (prototype
Python de référence dans `C:\Users\Admin\ProPresenterTools\`). Prochaine étape :
scaffold de la PWA + portage de l'encodeur `.proPlaylist` en TypeScript, validé
octet-pour-octet contre le fichier de référence.

**Documents du projet :**

- `docs/plan.md` — plan détaillé (architecture, modèle de données, sprints, versions).
- `README.md` — présentation courte.

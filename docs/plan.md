# Tramea — Générateur de trames ProPresenter

> Application web (PWA) pour **créer** les trames de culte et les **exporter**
> directement en `.proPlaylist` (importable dans ProPresenter 7) et en **PDF**
> (feuille de culte).

---

## 1. Vision

Aujourd'hui, les trames sont préparées dans un document externe (Word/PDF), puis
re-saisies à la main dans ProPresenter. Tramea devient **l'endroit où la trame est
créée** : on choisit les chants directement dans la bibliothèque ProPresenter, on
ajoute les moments liturgiques, et l'app génère :

- le **PDF** (la feuille de culte, mise en page actuelle) ;
- le **`.proPlaylist`** (import direct dans ProPresenter, chants + médias inclus).

**Bénéfice clé :** les données naissent **structurées (JSON)**. Plus d'extraction
PDF fragile, plus de mojibake, plus de fuzzy-matching incertain — le `.pro` est
pointé exactement.

---

## 2. Principes d'architecture

```
┌── PWA (navigateur, Vite + React + TS) ──────────────────┐
│  🔐 Garde d'accès (login obligatoire)                   │
│  📁 Dossier ProPresenter (local, File System Access)    │
│  ✏️  Éditeur de trame → JSON                            │
│  📤 Export .proPlaylist + PDF (100% local)              │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS (auth + métadonnées légères)
┌──────────────────▼─────── Supabase (BaaS) ──────────────┐
│  Auth (lien magique)  ·  Users + rôles  ·  Postgres+RLS │
│  Trames sauvegardées & modèles partagés (dès v0.5)      │
└──────────────────────────────────────────────────────────┘
```

- **Le cœur tourne dans le navigateur** : lecture des `.pro`, génération
  protobuf, zip, PDF. Aucun calcul lourd côté serveur.
- **Les fichiers ProPresenter ne quittent jamais le poste.** Seules les
  métadonnées de trame (JSON) peuvent être synchronisées dans le cloud.
- **Offline-first** : l'app fonctionne hors-ligne après le premier login.

---

## 3. Stack technique (verrouillée)

| Domaine | Choix |
|---|---|
| Front | **Vite + React + TypeScript** |
| UI | **Tailwind CSS** |
| État | **Zustand** |
| Persistance locale | **idb-keyval** (IndexedDB) |
| PWA | **vite-plugin-pwa** (offline / installable) |
| Export ZIP | **fflate** |
| Export PDF | **pdf-lib** |
| Auth + Données | **Supabase** (Auth lien magique + Postgres + RLS) |

> Pas de Next.js : l'app est un front pur ; Supabase fournit la couche serveur
> (auth + base) sans backend à écrire. Migration possible plus tard si besoin de
> fonctions serveur avancées.

---

## 4. Accès & authentification

### Connexion (lien magique)
```
1. L'utilisateur saisit son email → reçoit un lien magique (Supabase)
2. Clic → session créée → vérification du statut en base
3. "pending"  → écran « Accès en attente d'approbation »
   "approved" → accès à l'app selon le rôle
4. Un admin approuve / attribue le rôle
```

### Rôles
| Rôle | Droits |
|---|---|
| **admin** | approuve les utilisateurs, gère les rôles, tout faire |
| **éditeur** | créer / modifier / exporter des trames |
| **lecteur** | consulter / exporter, sans modifier |
| *(non approuvé)* | bloqué (écran d'attente) |

### Sécurité
- Auth via Supabase (JWT). **Clé service jamais exposée** au front (clé anon + RLS).
- Row Level Security : chaque rôle ne voit/modifie que ce qu'il a le droit.
- Session mise en cache pour l'usage hors-ligne.
- Fichiers ProPresenter **jamais envoyés** au serveur.

---

## 5. Modèle de données (cœur de l'app)

```jsonc
{
  "date": "2026-06-13",
  "titre": "Église Adventiste – Lille",
  "sections": [
    {
      "label": "ÉCOLE DU SABBAT",
      "items": [
        {
          "type": "song",
          "titre": "Seigneur, mon âme soupire",
          "ref": "H&L 508",
          "proFile": "Seigneur, mon âme soupire - H&L 508.pro",
          "tonalite": "Sol",
          "officiant": "",
          "note": "Strophes 1, 2"
        },
        { "type": "label", "titre": "Bienvenue", "officiant": "Philippe" }
      ]
    }
  ]
}
```

- `type: "song"` → ligne fichier dans le `.proPlaylist` + ligne tableau dans le PDF.
- `type: "label"` → moment liturgique (header/texte) dans les deux exports.
- `proFile` est **choisi à la main** dans la bibliothèque → zéro ambiguïté.

### Types TypeScript (cible)
```ts
type ItemType = "song" | "label";

interface TrameItem {
  type: ItemType;
  titre: string;
  ref?: string;        // ex "H&L 508"
  proFile?: string;    // nom de fichier .pro exact (si song)
  tonalite?: string;
  officiant?: string;
  note?: string;
}
interface Section { label: string; items: TrameItem[]; }
interface Trame { date: string; titre: string; sections: Section[]; }
```

---

## 6. Format `.proPlaylist` (déjà rétro-conçu)

Archive **ZIP** contenant :
```
data                  ← structure de la playlist (protobuf)
<Chant>.pro           ← chaque présentation, à la racine (par nom)
Media/<fichier>       ← médias référencés par les .pro
PDF/                  ← dossier
```

Structure du `data` (protobuf) :
```
top   : f1=en-tête version, f2=1, f3=document
doc   : { f1:uuid, f3:4, f12{ f1: playlist } }
pl    : { f1:uuid, f2:nom, f13: conteneur{ f1 répétés = items } }
header: { f1:uuid, f2:nom, f3{ f1:couleur RGBA fix32, f2:segment 164o } }
file  : { f1:uuid, f2:nom, f4{ f1{f1:abspath,f3:2,f4{f1:10,f2:relpath}}, f2{f1:uuid} } }
```

- ProPresenter relie les éléments **par nom de fichier**, pas par UUID.
- Gabarits binaires (en-tête version, segment countdown 164 o, couleurs de
  section) extraits d'un export natif → embarqués en **base64**.
- Référence Python validée : `C:\Users\Admin\ProPresenterTools\export_proplaylist.py`
  (+ `propb.py`, `templates.json`). **À porter en TypeScript.**

---

## 7. Export PDF (feuille de culte)

Reproduit la mise en page actuelle :

`Titre / Moment | Réf recueil | Tonalité | Officiant | Note / Chant projeté`

avec bandeaux de section (ÉCOLE DU SABBAT, CULTE D'ADORATION, TEMPS DE LOUANGES…).

---

## 8. Aperçu UI (éditeur)

```
┌─────────────────────────────────────────────────────────────┐
│ Tramea  Sabbat ▸ 13 juin 2026            📁 ProPresenter ✓   │
├──────────────────────────┬──────────────────────────────────┤
│  Bibliothèque  [recherche]│  TRAME                            │
│  H&L 508 Seigneur mon âme │  ▾ ÉCOLE DU SABBAT      [+ chant] │
│  JEM 614 Digne es-tu      │     ⠿ Seigneur mon âme  H&L 508   │
│  JEM 724 Agnus Dei        │  ▾ CULTE D'ADORATION   [+ texte] │
│  …  (glisser vers la trame)│     ⠿ Prélude (texte)            │
│                           │     ⠿ Agnus Dei         JEM 724   │
│  [+ Section]              │  [👁 Aperçu PDF] [⬇ .proPlaylist] │
└──────────────────────────┴──────────────────────────────────┘
```

---

## 9. Plan par sprints (2 semaines/sprint, ajustable)

| Sprint | Objectif | Livrable | « Done » |
|---|---|---|---|
| **S0 — Socle** | Repo, stack, design system, **modèle JSON**, CI/déploiement | Squelette PWA déployé | l'app démarre, installable |
| **S1 — Dossier & biblio** | `showDirectoryPicker`, index des `.pro`, mémorisation (IndexedDB) | Liste des chants | on voit ses ~3469 chants, re-permission 1 clic |
| **S2 — Éditeur** | Sections, ajout chants (recherche/drag), libellés, réordonnancement | Éditeur fonctionnel (local) | construire une trame complète en JSON |
| **S3 — Export .proPlaylist** | Port encodeur en JS, lecture `.pro`+médias, zip | `.proPlaylist` généré | **validé octet-pour-octet** vs référence |
| **S4 — Export PDF** | Mise en page actuelle (réf/tonalité/officiant) | PDF imprimable | PDF identique aux trames actuelles |
| **S5 — Bibliothèque + paroles** | Lecture des `.pro` (titre **+ paroles**), recherche, cache | Biblio cherchable avec aperçu des paroles | trouver un chant par titre ou par parole |
| **S6 — Slides récurrents** | Palette d'éléments standards (Annonces, Prélude…), import depuis une playlist PP | Ajout en 1 clic des slides récurrents | composer une trame complète sans rien retaper |
| **S7 — Auth & rôles** | Supabase, lien magique, approbation, gating | App protégée | non-autorisé bloqué ; admin approuve |
| **S8 — Cloud trames** | Sauvegarde/chargement trames, modèles partagés, panneau admin | Multi-poste | rouvrir une trame depuis un autre poste |
| **S9 — Éditeur de paroles / medley** | Moteur d'**écriture de `.pro`** (clone de gabarit + injection des strophes), thème appliqué | Créer un chant custom/medley | nouveau `.pro` valide ouvert dans ProPresenter |
| **S10 — Thèmes** | Choix d'un thème par nom, appliqué aux chants générés + Theme embarqué | Trame thématisée | les chants générés adoptent le thème choisi |
| **S11 — Finitions** | Offline robuste, perf, erreurs, tests, docs | Release stable | checklist qualité OK |

---

## 10. Versions / jalons

| Version | Contenu | Quand |
|---|---|---|
| **v0.1 — Alpha** | Éditeur + JSON local (S0→S2) | fin S2 |
| **v0.2 — Exports** | + `.proPlaylist` + PDF, utilisable de bout en bout (S3→S4) | fin S4 |
| **v0.3 — Bibliothèque** | + biblio chants/paroles + slides récurrents (S5→S6) | fin S6 |
| **v0.4 — Accès restreint** | + Auth, users, rôles (S7) | fin S7 |
| **v0.5 — Beta cloud** | + sauvegarde/partage trames & modèles (S8) | fin S8 |
| **v0.7 — Chants & thèmes** | + éditeur de paroles/medley (écriture `.pro`) + thèmes (S9→S10) | fin S10 |
| **v1.0 — Stable** | + offline/perf/tests/docs, PWA installable (S11) | fin S11 |

**Durée indicative : ~24 semaines** (12 sprints) à temps partiel.

---

## 10bis. Fonctionnalités étendues (chants, slides récurrents, thèmes)

### A. Bibliothèque de chants avec paroles
- **Import de tous les chants** : lecture de chaque `.pro` pour extraire
  **titre + paroles** (texte RTF des diapos, regroupées par section : Couplet,
  Refrain…). Indexé et mis en cache (IndexedDB) pour une recherche rapide
  (par titre **ou** par parole).
- L'éditeur affiche un **aperçu des paroles** avant d'ajouter un chant.

### B. Édition de paroles / medley → nouveau chant
- Modifier les paroles **ne touche jamais** au chant original : Tramea crée
  **un nouveau chant** (nouveau titre, nouveau `.pro`, nouvel UUID).
- Nécessite un **moteur d'écriture de `.pro`** (présentation protobuf) :
  approche **clone de gabarit** — partir d'une présentation simple, dupliquer la
  diapo type, injecter les strophes en RTF, recalculer les UUID. (Brique la plus
  lourde → v0.7.)

### C. Slides récurrents absents du programme
- **Bandeaux de section** (PRÉLUDE, ANNONCES, INTERCESSION, POSTLUDE…) : déjà
  générés comme headers colorés → proposés dans une **palette standard**.
- **Présentations récurrentes** (Annonces, Sujets de prière, vidéo d'intro…) :
  marquées comme **favoris** ou **importées depuis une playlist ProPresenter**,
  puis ajoutées en **1 clic**. La liste est mémorisée pour chaque semaine.

### D. Thèmes
- Constat technique : un `.pro` **n'a pas** de référence vivante au thème — le
  thème est **cuit dans les diapos** à leur création (ni nom, ni UUID de thème
  dans le fichier). Pas de simple « référence par nom » au niveau playlist.
- Approche Tramea :
  - lire les thèmes disponibles depuis le dossier `Themes/` (par nom) ;
  - **appliquer le thème choisi aux chants générés** par Tramea (style cuit dans
    les nouvelles diapos) ;
  - **embarquer le fichier `Theme`** dans l'export si nécessaire ;
  - pour les chants existants : look d'origine conservé (re-thématisation
    avancée envisageable plus tard).

---

## 11. Premier lot (à démarrer)

**Sprint 0 + port de l'encodeur (S3 anticipé)** — le plus dérisquant :

1. Scaffold PWA (Vite + React + TS + Tailwind + PWA) + structure + types `Trame`.
2. Port de l'encodeur `.proPlaylist` en TypeScript + `templates` en base64.
3. **Test de validation octet-pour-octet** vs le `.proPlaylist` de référence.

→ On prouve que le JS produit un fichier ProPresenter rigoureusement identique
**avant** de construire l'UI.

---

## 12. Références (travail Python déjà validé)

Dossier `C:\Users\Admin\ProPresenterTools\` :
- `export_proplaylist.py` — structure `data` + zip + médias (**à porter**).
- `propb.py` — encodeur protobuf exact (~30 lignes, **à porter**).
- `templates.json` — gabarits (en-tête, segment, couleurs).
- `program_reader.py` — parsing PDF/MD (filet de secours futur, pas dans le MVP).

Bibliothèque ProPresenter : `C:\Users\Admin\OneDrive - D3\Documents\ProPresenter\`
(`Libraries/`, `Media/`, `Playlists/`, `Themes/`).

**Briques nouvelles (R&D à faire) :**
- **Lecture des paroles** d'un `.pro` (texte RTF par diapo/section) — extraction
  déjà démontrée, à fiabiliser.
- **Écriture d'un `.pro`** (présentation) pour les chants medley/édités — approche
  clone de gabarit, non encore prototypée (la plus lourde).
- **Thèmes** : appliquer un thème aux diapos générées — spike technique dédié.

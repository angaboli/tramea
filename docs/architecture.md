# Tramea — Architecture & conventions de code

Standards **non négociables** : TDD · Clean Code · SOLID · Clean Architecture ·
Security-first · Mobile-first.

## Couches (Clean Architecture)

```
src/
├── domain/         # Entités + règles métier PURES (aucune dépendance externe)
│   ├── trame/      #   Trame, Section, Item, Programme, value objects
│   ├── library/    #   Song, MediaRef
│   └── ports/      #   Interfaces (FileSystemPort, AuthPort, AiDiffPort…)
├── application/    # Cas d'usage (orchestration), dépend de domain + ports
│   └── usecases/   #   BuildProplaylist, DiffPlaylist, ApproveUser…
├── infrastructure/ # Implémentations des ports (adapters)
│   ├── proplaylist/#   encodeur protobuf + zip (port de propb/export_proplaylist)
│   ├── fs/         #   File System Access API
│   ├── supabase/   #   auth + données
│   └── persistence/#   IndexedDB (idb-keyval)
└── ui/             # React : composants, écrans, stores (Zustand)
    ├── components/ #   design system (Button, Card, Badge, Input…)
    ├── screens/    #   éditeur, sélection chants, aperçu PDF
    └── stores/     #   theme, trame, session
```

**Règle de dépendance :** les flèches pointent vers l'intérieur.
`domain` ne connaît **rien** (ni React, ni Supabase, ni disque). `ui` et
`infrastructure` dépendent de `application`/`domain`, jamais l'inverse.
Les couches externes implémentent des **ports** (interfaces) définis dans `domain`.

## SOLID
- **S** — une responsabilité par module/classe (un usecase = une intention).
- **O** — extension par nouveaux adapters, pas par modification du domaine.
- **L** — toute implémentation d'un port est substituable (testée par contrat).
- **I** — ports fins et ciblés (`ProplaylistEncoderPort` ≠ `FileSystemPort`).
- **D** — l'application dépend d'**abstractions** (ports), injectées au runtime.

## TDD
- **Rouge → Vert → Refactor.** On écrit le test avant le code.
- **Vitest** + Testing Library. Tests colocalisés `*.test.ts(x)`.
- Le domaine et les usecases visent une **couverture élevée** (logique critique).
- L'encodeur `.proPlaylist` a un **test d'or** : comparaison **octet-pour-octet**
  avec un fichier de référence exporté par ProPresenter.
- Les ports ont des **tests de contrat** réutilisés par chaque adapter.

## Security-first
- **Deny-by-default** : accès refusé tant qu'un admin n'a pas approuvé.
- Auth Supabase (JWT) ; **clé service jamais** dans le front (clé anon + **RLS**).
- Validation/typage strict des entrées (zod aux frontières).
- Aucun secret en clair ; variables d'environnement `.env` non commitées.
- Les fichiers ProPresenter **ne quittent jamais le poste**.

## Mobile-first
- Styles pensés d'abord pour petit écran, élargis ensuite (breakpoints montants).
- Cibles tactiles **44 px**, espacement généreux (design system aéré).
- Pas de fonctionnalité bloquée sur desktop-only sauf le strict nécessaire
  (la File System Access API ; sinon **mode dégradé** pleinement utilisable).

## Modes de fonctionnement
- **Sans dossier ProPresenter** (par défaut) : programme + PDF + sauvegarde JSON.
- **Avec dossier** : en plus, index `.pro`, médias, export `.proPlaylist`.
- Le dossier est une **capacité optionnelle**, jamais un prérequis bloquant.

## Qualité
- TypeScript `strict`. ESLint + Prettier. CI : lint + typecheck + tests.
- Commits conventionnels. Revue avant merge sur la branche par défaut.

# Créer un chant (et un medley) dans Tramea

Dans Tramea, **créer un nouveau chant** et **créer un medley**, c'est la même
chose : on part d'un **chant modèle** (`.pro` existant de ta bibliothèque, pour
une mise en forme et un fond valides) et on **réécrit le texte des diapos**. Un
medley n'est donc qu'un chant dont on met, à la suite, les strophes de plusieurs
chants. Pas de cas particulier : un seul mécanisme.

## Pré-requis

1. Être dans l'**éditeur de trame** (pas l'éditeur de programme).
   Tableau de bord → **Créer une trame**.
2. Avoir **connecté le dossier ProPresenter** (bouton « Connecter le dossier »
   en haut de l'éditeur de trame). Sans bibliothèque, le bouton medley est masqué
   car il n'y a aucun `.pro` de base à cloner.

## Étapes

1. Ajoute une ligne **+ Chant** dans une section.
2. Sur la ligne du chant, clique le bouton **Créer le chant**.
   - Ce bouton n'apparaît **que** sur une ligne de type *Chant*, en mode trame,
     bibliothèque connectée.
3. Dans la fenêtre medley :
   - **Titre** du medley (nom de la présentation générée).
   - **Chant de base** : choisis le `.pro` à cloner (sa mise en forme, son fond
     et le nombre de diapos servent de gabarit).
   - **Diapos** : saisis le texte de chaque diapo, **une diapo par bloc**
     (un saut de ligne dans un bloc = nouvelle ligne dans la diapo). La 1re
     entrée remplace la 1re diapo, la 2e la 2e, etc.
4. Enregistre. La ligne devient un chant personnalisé.
5. **Exporter en .proPlaylist** : Tramea clone le `.pro` de base, réécrit le
   texte des diapos et l'inclut dans le ZIP.

## Bon à savoir

- S'il y a **plus de diapos de texte que de diapos dans le chant de base**, le
  surplus est ignoré : choisis un chant de base avec assez de diapos.
- S'il y a **moins** de textes que de diapos, les diapos restantes gardent leur
  texte d'origine.
- Le fond/visuel et la tonalité proviennent du chant de base : choisis-en un
  proche du rendu voulu.

## Dépannage

- **Pas de bouton « Créer le chant »** → tu es en mode *programme* (passe en *trame*) ou la
  bibliothèque n'est pas connectée (« Connecter le dossier »).
- **Medley vide à l'import dans ProPresenter** → problème connu en cours de
  correction : envoie le `.pro` de base utilisé pour qu'on cartographie la
  structure des diapos.

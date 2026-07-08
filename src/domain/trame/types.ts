/**
 * Domaine — modèle Programme / Trame.
 * Couche PURE : aucune dépendance React, Supabase, disque ou réseau.
 */

export type ItemType = 'song' | 'label';

/** Un élément d'une section : un chant (référence un .pro) ou un libellé liturgique. */
export interface TrameItem {
  id: string;
  type: ItemType;
  titre: string;
  ref?: string; // ex "H&L 508"
  proFile?: string; // nom de fichier .pro exact (si chant trouvé)
  tonalite?: string;
  officiant?: string;
  note?: string;
  /** Verset / passage biblique (ex. méditation). */
  verset?: string;
  /** Lien (URL) — ex. bande son du prélude ; cliquable dans le PDF. */
  lien?: string;
  /** Couleur du titre sur le PDF (hex #rrggbb). Absent ⇒ couleur par défaut. */
  color?: string;
  /**
   * Chant personnalisé / medley : généré en clonant `baseProFile` et en
   * remplaçant le texte des diapos par `slides` (un texte par diapo).
   * `groups` (optionnel, même longueur que `slides`) : étiquette de groupe
   * par diapo (« Couplet 1 », « Refrain »…) saisie à la création — sert à
   * l'affichage groupé des paroles, comme pour un chant réel de la
   * bibliothèque. N'affecte pas la structure ProPresenter du fichier généré.
   */
  customSong?: { baseProFile: string; slides: string[]; groups?: (string | undefined)[] };
}

export interface Section {
  id: string;
  label: string;
  items: TrameItem[];
  /** Couleur de la bande de section sur le PDF (hex #rrggbb). Absent ⇒ saumon. */
  color?: string;
}

/**
 * Programme = l'ordre de culte (humain, imprimable). Créé par le rôle « basique ».
 */
export interface Programme {
  id: string;
  date: string; // ISO yyyy-mm-dd
  titre: string;
  sections: Section[];
  /**
   * Nature du document : « programme » (ordre de culte imprimable) ou « trame »
   * (séquence ProPresenter). Permet de rouvrir directement dans le bon mode.
   * Optionnel pour compat. ascendante (absent ⇒ programme).
   */
  kind?: 'programme' | 'trame';
  /** Couleur du bandeau d'en-tête (titre) sur le PDF. Absent ⇒ couleur par défaut. */
  titleColor?: string;
}

/**
 * Trame = séquence ProPresenter dérivée d'un programme (rôle « avancé »).
 * Toujours rattachée à un programme.
 */
export interface Trame {
  id: string;
  programmeId: string;
  nom: string;
}

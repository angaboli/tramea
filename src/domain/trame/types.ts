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
}

export interface Section {
  id: string;
  label: string;
  items: TrameItem[];
}

/**
 * Programme = l'ordre de culte (humain, imprimable). Créé par le rôle « basique ».
 */
export interface Programme {
  id: string;
  date: string; // ISO yyyy-mm-dd
  titre: string;
  sections: Section[];
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

import type { ItemType } from './types';

/**
 * Item par défaut créé à la création d'une section preset — UNIQUEMENT si un
 * `.pro` correspondant existe dans la bibliothèque connectée (sinon rien : une
 * section vide, comme avant). Les sections dont le contenu change chaque
 * semaine (Culte d'adoration, Temps de louanges) sont volontairement absentes
 * de cette table : aucun item par défaut n'a de sens pour elles.
 */
export interface SectionDefaultItem {
  titre: string;
  type: ItemType;
  matchKeys: readonly string[];
}

export const SECTION_DEFAULT_ITEMS: Readonly<Record<string, SectionDefaultItem>> = {
  'ÉCOLE DU SABBAT': { titre: 'École du sabbat', type: 'label', matchKeys: ['ecole du sabbat'] },
  PRÉLUDE: { titre: 'Prélude', type: 'label', matchKeys: ['prelude'] },
  POSTLUDE: { titre: 'Postlude', type: 'label', matchKeys: ['postlude'] },
  ANNONCES: { titre: 'Annonces', type: 'label', matchKeys: ['annonces'] },
  INTERCESSION: {
    titre: 'Intercession',
    type: 'label',
    matchKeys: ['intercession', 'groupe de priere'],
  },
};

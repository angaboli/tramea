import { describe, it, expect } from 'vitest';
import { programmeToExportItems } from './programmeToExportItems';
import type { Programme } from '../../domain/trame/types';

const programme: Programme = {
  id: 'p1',
  date: '2026-06-13',
  titre: 'Test',
  sections: [
    {
      id: 's1',
      label: 'ÉCOLE DU SABBAT',
      items: [
        { id: 'a', type: 'song', titre: 'Agnus Dei', ref: 'JEM 724', proFile: 'Agnus Dei.pro' },
        { id: 'b', type: 'song', titre: 'Sans fichier' },
        { id: 'c', type: 'label', titre: 'Bienvenue' },
        { id: 'd', type: 'label', titre: 'Annonces', proFile: 'Annonces.pro' },
      ],
    },
  ],
};

describe('programmeToExportItems', () => {
  it('mappe sections, chants, libellés et moments liés à un .pro', () => {
    const items = programmeToExportItems(programme);
    expect(items).toEqual([
      { kind: 'header', label: 'ÉCOLE DU SABBAT' },
      { kind: 'song', label: 'Agnus Dei - JEM 724', proFile: 'Agnus Dei.pro' },
      { kind: 'header', label: '[A AJOUTER] Sans fichier' },
      { kind: 'header', label: 'Bienvenue' },
      // Un moment lié à une présentation (Annonces) est bundlé comme fichier.
      { kind: 'song', label: 'Annonces', proFile: 'Annonces.pro' },
    ]);
  });
});

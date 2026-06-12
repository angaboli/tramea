import { describe, it, expect } from 'vitest';
import { buildProgrammePdf } from './buildProgrammePdf';
import type { Programme } from '../../domain/trame/types';

const programme: Programme = {
  id: 'p1',
  date: '2026-06-13',
  titre: 'Église Adventiste – Lille',
  sections: [
    {
      id: 's1',
      label: 'ÉCOLE DU SABBAT',
      items: [
        { id: 'i1', type: 'song', titre: 'Mon cœur t’adore', ref: 'JEM 455', tonalite: 'Sol', officiant: 'Philippe', note: 'C1-R-C2' },
        { id: 'i2', type: 'label', titre: 'Bienvenue', officiant: 'Marie' },
      ],
    },
  ],
};

describe('buildProgrammePdf', () => {
  it('produit un PDF valide (en-tête %PDF, taille non triviale)', async () => {
    const bytes = await buildProgrammePdf(programme);
    expect(bytes.length).toBeGreaterThan(800);
    const head = new TextDecoder().decode(bytes.slice(0, 5));
    expect(head).toBe('%PDF-');
  });

  it('gère un grand programme sur plusieurs pages sans erreur', async () => {
    const big: Programme = {
      ...programme,
      sections: Array.from({ length: 12 }, (_, s) => ({
        id: `s${s}`,
        label: `SECTION ${s}`,
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `i${s}-${i}`,
          type: 'song' as const,
          titre: `Chant ${s}-${i}`,
          ref: 'H&L 100',
        })),
      })),
    };
    const bytes = await buildProgrammePdf(big);
    expect(bytes.length).toBeGreaterThan(2000);
  });
});

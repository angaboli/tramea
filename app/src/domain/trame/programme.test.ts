import { describe, it, expect } from 'vitest';
import {
  countSongs,
  missingProFiles,
  isExportableToProplaylist,
  moveItem,
} from './programme';
import type { Programme, Section } from './types';

const song = (id: string, proFile?: string) =>
  ({ id, type: 'song' as const, titre: id, proFile });
const label = (id: string) => ({ id, type: 'label' as const, titre: id });

const programme = (sections: Section[]): Programme => ({
  id: 'p1',
  date: '2026-06-13',
  titre: 'Test',
  sections,
});

describe('countSongs', () => {
  it('compte uniquement les chants, pas les libellés', () => {
    const p = programme([
      { id: 's1', label: 'EDS', items: [song('a', 'a.pro'), label('Bienvenue')] },
      { id: 's2', label: 'LOUANGES', items: [song('b', 'b.pro')] },
    ]);
    expect(countSongs(p)).toBe(2);
  });

  it('retourne 0 pour un programme vide', () => {
    expect(countSongs(programme([]))).toBe(0);
  });
});

describe('missingProFiles', () => {
  it('liste les chants sans fichier .pro', () => {
    const p = programme([
      { id: 's1', label: 'EDS', items: [song('a', 'a.pro'), song('b')] },
    ]);
    const missing = missingProFiles(p);
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe('b');
  });
});

describe('isExportableToProplaylist', () => {
  it('faux si un chant manque de .pro', () => {
    const p = programme([{ id: 's1', label: 'EDS', items: [song('a')] }]);
    expect(isExportableToProplaylist(p)).toBe(false);
  });

  it('vrai si tous les chants ont un .pro', () => {
    const p = programme([
      { id: 's1', label: 'EDS', items: [song('a', 'a.pro'), label('x')] },
    ]);
    expect(isExportableToProplaylist(p)).toBe(true);
  });

  it('faux si aucun chant', () => {
    const p = programme([{ id: 's1', label: 'EDS', items: [label('x')] }]);
    expect(isExportableToProplaylist(p)).toBe(false);
  });
});

describe('moveItem', () => {
  const base: Section = {
    id: 's1',
    label: 'EDS',
    items: [song('a'), song('b'), song('c')],
  };

  it('réordonne sans muter la section d’origine', () => {
    const moved = moveItem(base, 0, 2);
    expect(moved.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(base.items.map((i) => i.id)).toEqual(['a', 'b', 'c']); // immutable
  });

  it('ignore les index hors limites', () => {
    expect(moveItem(base, 0, 9)).toBe(base);
  });
});

import { describe, it, expect } from 'vitest';
import { searchProgrammes } from './searchProgrammes';
import type { Programme } from './types';

const p = (titre: string, date: string): Programme => ({
  id: titre,
  titre,
  date,
  sections: [],
});

const list = [
  p('Sabbat de la Sainte Cène', '2026-06-13'),
  p('Culte de Pâques', '2026-04-04'),
  p('Soirée louange', '2026-05-10'),
];

describe('searchProgrammes', () => {
  it('requête vide → tout, ordre conservé', () => {
    expect(searchProgrammes(list, '').map((x) => x.titre)).toEqual([
      'Sabbat de la Sainte Cène',
      'Culte de Pâques',
      'Soirée louange',
    ]);
  });

  it('filtre par titre (insensible aux accents)', () => {
    expect(searchProgrammes(list, 'cene').map((x) => x.titre)).toEqual([
      'Sabbat de la Sainte Cène',
    ]);
  });

  it('filtre par date', () => {
    expect(searchProgrammes(list, '2026-04').map((x) => x.titre)).toEqual([
      'Culte de Pâques',
    ]);
  });

  it('tous les tokens doivent matcher', () => {
    expect(searchProgrammes(list, 'culte paques').map((x) => x.titre)).toEqual([
      'Culte de Pâques',
    ]);
    expect(searchProgrammes(list, 'culte louange')).toEqual([]);
  });
});

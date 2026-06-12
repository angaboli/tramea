import { describe, it, expect } from 'vitest';
import { duplicateProgramme } from './duplicate';
import type { Programme } from './types';

const source: Programme = {
  id: 'p1',
  titre: 'Sabbat du 6 juin',
  date: '2026-06-06',
  sections: [
    {
      id: 's1',
      label: 'EDS',
      items: [{ id: 'i1', type: 'song', titre: 'Agnus Dei', ref: 'JEM 724' }],
    },
  ],
};

describe('duplicateProgramme', () => {
  it('génère de nouveaux identifiants à tous les niveaux', () => {
    const copy = duplicateProgramme(source);
    expect(copy.id).not.toBe(source.id);
    expect(copy.sections[0].id).not.toBe(source.sections[0].id);
    expect(copy.sections[0].items[0].id).not.toBe(source.sections[0].items[0].id);
  });

  it('conserve le contenu (titre, label, item)', () => {
    const copy = duplicateProgramme(source);
    expect(copy.titre).toBe('Sabbat du 6 juin');
    expect(copy.sections[0].label).toBe('EDS');
    expect(copy.sections[0].items[0]).toMatchObject({ titre: 'Agnus Dei', ref: 'JEM 724' });
  });

  it('réinitialise la date si fournie, sans muter l’original', () => {
    const copy = duplicateProgramme(source, '2026-06-13');
    expect(copy.date).toBe('2026-06-13');
    expect(source.date).toBe('2026-06-06');
    expect(source.sections[0].items).toHaveLength(1);
  });
});

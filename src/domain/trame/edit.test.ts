import { describe, it, expect } from 'vitest';
import {
  emptyProgramme,
  addSection,
  renameSection,
  removeSection,
  moveSection,
  addItem,
  updateItem,
  removeItem,
  moveItem,
  moveItemToSection,
} from './edit';

describe('édition de programme (immutable)', () => {
  it('crée un programme vide', () => {
    const p = emptyProgramme('2026-06-13', 'Sabbat');
    expect(p.sections).toEqual([]);
    expect(p.titre).toBe('Sabbat');
    expect(p.id).toBeTruthy();
  });

  it('ajoute une section sans muter l’original', () => {
    const p0 = emptyProgramme('2026-06-13');
    const p1 = addSection(p0, 'EDS');
    expect(p0.sections).toHaveLength(0);
    expect(p1.sections).toHaveLength(1);
    expect(p1.sections[0].label).toBe('EDS');
  });

  it('renomme et supprime une section', () => {
    let p = addSection(emptyProgramme('d'), 'EDS');
    const id = p.sections[0].id;
    p = renameSection(p, id, 'ÉCOLE DU SABBAT');
    expect(p.sections[0].label).toBe('ÉCOLE DU SABBAT');
    p = removeSection(p, id);
    expect(p.sections).toHaveLength(0);
  });

  it('réordonne les sections', () => {
    let p = emptyProgramme('d');
    p = addSection(p, 'A');
    p = addSection(p, 'B');
    p = addSection(p, 'C');
    p = moveSection(p, 0, 2);
    expect(p.sections.map((s) => s.label)).toEqual(['B', 'C', 'A']);
  });

  it('ajoute, met à jour, déplace et supprime des items', () => {
    let p = addSection(emptyProgramme('d'), 'EDS');
    const sid = p.sections[0].id;
    p = addItem(p, sid, 'song', 'Agnus Dei');
    p = addItem(p, sid, 'label', 'Bienvenue');
    expect(p.sections[0].items).toHaveLength(2);

    const songId = p.sections[0].items[0].id;
    p = updateItem(p, sid, songId, { ref: 'JEM 724', proFile: 'Agnus.pro' });
    expect(p.sections[0].items[0].ref).toBe('JEM 724');
    expect(p.sections[0].items[0].proFile).toBe('Agnus.pro');

    p = moveItem(p, sid, 0, 1);
    expect(p.sections[0].items.map((i) => i.titre)).toEqual(['Bienvenue', 'Agnus Dei']);

    p = removeItem(p, sid, songId);
    expect(p.sections[0].items.map((i) => i.titre)).toEqual(['Bienvenue']);
  });

  describe('moveItemToSection', () => {
    it('déplace un item vers une autre section (à la fin)', () => {
      let p = addSection(emptyProgramme('d'), 'A');
      p = addSection(p, 'B');
      const [a, b] = p.sections;
      p = addItem(p, a.id, 'song', 'Chant 1');
      p = addItem(p, b.id, 'label', 'Déjà là');
      const itemId = p.sections[0].items[0].id;

      p = moveItemToSection(p, a.id, itemId, b.id);

      expect(p.sections.find((s) => s.id === a.id)!.items).toHaveLength(0);
      expect(p.sections.find((s) => s.id === b.id)!.items.map((i) => i.titre)).toEqual([
        'Déjà là',
        'Chant 1',
      ]);
    });

    it('conserve les données de l’item (proFile, ref…)', () => {
      let p = addSection(emptyProgramme('d'), 'A');
      p = addSection(p, 'B');
      const [a, b] = p.sections;
      p = addItem(p, a.id, 'song', 'Chant 1', { ref: 'JEM 1', proFile: 'x.pro' });
      const itemId = p.sections[0].items[0].id;

      p = moveItemToSection(p, a.id, itemId, b.id);

      const moved = p.sections.find((s) => s.id === b.id)!.items[0];
      expect(moved).toMatchObject({ id: itemId, ref: 'JEM 1', proFile: 'x.pro' });
    });

    it('ne fait rien si la section de destination est la même', () => {
      let p = addSection(emptyProgramme('d'), 'A');
      const a = p.sections[0];
      p = addItem(p, a.id, 'song', 'Chant 1');
      const before = p;

      p = moveItemToSection(p, a.id, p.sections[0].items[0].id, a.id);

      expect(p).toBe(before);
    });

    it('ne fait rien si la section ou l’item est introuvable', () => {
      let p = addSection(emptyProgramme('d'), 'A');
      const a = p.sections[0];
      p = addItem(p, a.id, 'song', 'Chant 1');
      const itemId = p.sections[0].items[0].id;

      expect(moveItemToSection(p, a.id, 'inconnu', a.id).sections[0].items).toHaveLength(1);
      expect(moveItemToSection(p, a.id, itemId, 'inconnue').sections[0].items).toHaveLength(1);
    });
  });
});

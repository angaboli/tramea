import { describe, it, expect } from 'vitest';
import { buildTrameTemplate } from './trameTemplate';

describe('buildTrameTemplate', () => {
  const p = buildTrameTemplate('2026-06-20', 'Sabbat');

  it('crée une trame (kind) à la date/titre donnés', () => {
    expect(p.kind).toBe('trame');
    expect(p.date).toBe('2026-06-20');
    expect(p.titre).toBe('Sabbat');
  });

  it('suit la chronologie habituelle : École du sabbat, Annonces, Intercession, Culte d’adoration', () => {
    expect(p.sections.map((s) => s.label)).toEqual([
      'ÉCOLE DU SABBAT',
      'ANNONCES',
      'INTERCESSION',
      "CULTE D'ADORATION",
    ]);
  });

  it('École du sabbat : 2 emplacements de chant vides', () => {
    const eds = p.sections[0];
    expect(eds.items).toHaveLength(2);
    for (const it of eds.items) {
      expect(it.type).toBe('song');
      expect(it.titre).toBe('');
    }
  });

  it('Annonces / Intercession : un moment chacun, pas de .pro pré-lié (fait par l’appelant)', () => {
    expect(p.sections[1].items.map((i) => i.titre)).toEqual(['Annonces']);
    expect(p.sections[2].items.map((i) => i.titre)).toEqual(['Intercession']);
    expect(p.sections[1].items[0].proFile).toBeUndefined();
  });

  it("Culte d'adoration suit l'ordre complet, avec 4 emplacements de chant vides (dont Chant spécial en item chant)", () => {
    const culte = p.sections[3];
    expect(culte.items.map((i) => i.titre)).toEqual([
      'Prélude',
      'Bienvenue',
      'Invocation',
      '',
      '',
      'Témoignages',
      'Morceau instrumental',
      '',
      'Prière à genoux',
      'Service de fidélité',
      'Message pour les enfants',
      'Méditation / Partage',
      'Chant spécial',
      'Prière finale',
      '',
      'Bénédiction',
      'Postlude',
    ]);
    const chantSpecial = culte.items.find((i) => i.titre === 'Chant spécial')!;
    expect(chantSpecial.type).toBe('song');
  });
});

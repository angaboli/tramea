import { describe, it, expect } from 'vitest';
import { parseProgramText } from './parseProgram';

const MD = `# Église Adventiste - Lille  Sabbat 7 juin 2025

ECOLE DU SABBAT

| J'ai soif de ta présence |  | H&L 359 |  | Sol |
| ------------------------ | -- | ------- | -- | --- |
| Digne es Tu              |  | JEM 614 |  | Do  |

TEMPS DE LOUANGES

| Prière à genoux | H&L 224 | Mib | Anciennat | Tel que je suis |
| Bénédiction     |         |     | Anciennat |                 |
`;

describe('parseProgramText', () => {
  it('détecte la date (ISO) et le titre', () => {
    const p = parseProgramText(MD);
    expect(p.date).toBe('2025-06-07');
    expect(p.titre).toMatch(/Adventiste/);
  });

  it('crée les sections nommées', () => {
    const labels = parseProgramText(MD).sections.map((s) => s.label);
    expect(labels).toContain('ÉCOLE DU SABBAT');
    expect(labels).toContain('TEMPS DE LOUANGES');
  });

  it('parse chants + référence', () => {
    const p = parseProgramText(MD);
    const eds = p.sections.find((s) => s.label === 'ÉCOLE DU SABBAT')!;
    expect(eds.items[0]).toMatchObject({ type: 'song', titre: "J'ai soif de ta présence", ref: 'H&L 359' });
    expect(eds.items[1]).toMatchObject({ titre: 'Digne es Tu', ref: 'JEM 614' });
  });

  it('extrait le chant projeté d’une ligne « moment | … | chant »', () => {
    const p = parseProgramText(MD);
    const lou = p.sections.find((s) => s.label === 'TEMPS DE LOUANGES')!;
    // "Prière à genoux" = libellé, "Tel que je suis" = chant (réf H&L 224)
    expect(lou.items[0]).toMatchObject({ type: 'label', titre: 'Prière à genoux' });
    expect(lou.items[1]).toMatchObject({ type: 'song', titre: 'Tel que je suis', ref: 'H&L 224' });
  });

  it('classe Bénédiction comme libellé', () => {
    const p = parseProgramText(MD);
    const lou = p.sections.find((s) => s.label === 'TEMPS DE LOUANGES')!;
    expect(lou.items.find((i) => i.titre === 'Bénédiction')?.type).toBe('label');
  });

  it('s’arrête aux paroles (section dupliquée)', () => {
    const withLyrics = MD + '\nECOLE DU SABBAT\nJ\'ai soif de ta présence\n1\nDivin chef de ma foi\n';
    const p = parseProgramText(withLyrics);
    // une seule section "ÉCOLE DU SABBAT"
    expect(p.sections.filter((s) => s.label === 'ÉCOLE DU SABBAT')).toHaveLength(1);
  });
});

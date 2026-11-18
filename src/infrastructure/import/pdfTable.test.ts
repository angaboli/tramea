import { describe, it, expect } from 'vitest';
import { joinFragments, tableRowsFromPage, rowsToLines, type PdfBox, type PdfTextItem } from './pdfTable';

const t = (str: string, x: number, y: number, w = str.length * 5, size = 10): PdfTextItem => ({ str, x, y, w, size });
const hLine = (y: number, x0 = 40, x1 = 560): PdfBox => ({ x0, x1, y0: y - 0.35, y1: y + 0.35 });
const vLine = (x: number, y0: number, y1: number): PdfBox => ({ x0: x - 0.7, x1: x + 0.7, y0, y1 });

describe('joinFragments', () => {
  it('recolle les petites capitales sans espace parasite (E + COLE)', () => {
    expect(joinFragments([t('E', 50, 700, 7, 10.3), t('COLE DU ', 57, 700, 40, 8), t('S', 97, 700, 7, 10.3), t('ABBAT', 104, 700, 30, 8)])).toBe(
      'ECOLE DU SABBAT',
    );
  });
  it('garde un espace quand il y a un vrai blanc entre deux mots', () => {
    expect(joinFragments([t('Hosanna', 50, 700, 40), t('Jésus', 100, 700, 30)])).toBe('Hosanna Jésus');
  });
});

describe('tableRowsFromPage', () => {
  // Tableau 3 rangées : bandeau fusionné, rangée à titre sur 2 lignes (+ réf centrée), rangée simple.
  const boxes: PdfBox[] = [
    hLine(700), hLine(670), hLine(620), hLine(590),
    vLine(40, 670, 700), vLine(560, 670, 700), // bandeau
    vLine(40, 620, 670), vLine(300, 620, 670), vLine(400, 620, 670), vLine(560, 620, 670),
    vLine(40, 590, 620), vLine(300, 590, 620), vLine(400, 590, 620), vLine(560, 590, 620),
  ];
  const items: PdfTextItem[] = [
    t('ECOLE DU SABBAT', 250, 680),
    t('Chant thème « Bientôt le Seigneur va', 50, 650),
    t('venir »', 50, 636),
    t('H&L 232', 330, 643),
    t('Do', 440, 643),
    t('C’est par la grâce', 50, 600),
    t('JEM 563', 330, 600),
  ];

  it('rattache le titre sur 2 lignes à SA rangée (une seule cellule)', () => {
    const rows = tableRowsFromPage(items, boxes)!;
    expect(rows).toHaveLength(3);
    expect(rows[1].cells[0]).toBe('Chant thème « Bientôt le Seigneur va venir »');
    expect(rows[1].cells[1]).toBe('H&L 232');
    expect(rows[1].cells[2]).toBe('Do');
  });

  it('détecte le bandeau fusionné et produit des lignes lisibles par le parseur', () => {
    const { lines } = rowsToLines(tableRowsFromPage(items, boxes)!, true);
    expect(lines[0]).toBe('ECOLE DU SABBAT');
    expect(lines[1]).toBe('| Chant thème « Bientôt le Seigneur va venir » | H&L 232 | Do |');
  });

  it('renvoie null sans tableau (page de paroles)', () => {
    expect(tableRowsFromPage([t('Refrain', 250, 600)], [hLine(610, 250, 330)])).toBeNull();
  });

  it('bandeau à bordures DOUBLÉES (2 traits à ~2 pt) = une seule cellule fusionnée', () => {
    // Bandeau noir : bordures gauche/droite dessinées en double (30 + 32, 556 + 558).
    const b: PdfBox[] = [
      hLine(700), hLine(670), hLine(640),
      vLine(30, 670, 700), vLine(32.3, 670, 700), vLine(556, 670, 700), vLine(558, 670, 700),
      vLine(30, 640, 670), vLine(300, 640, 670), vLine(556, 640, 670),
    ];
    const it: PdfTextItem[] = [t('ECOLE DU SABBAT', 250, 680, 80), t('Chant', 40, 650)];
    const rows = tableRowsFromPage(it, b)!;
    expect(rows[0]).toEqual({ cells: ['ECOLE DU SABBAT'], merged: true });
    expect(rowsToLines(rows, true).lines[0]).toBe('ECOLE DU SABBAT');
  });
});

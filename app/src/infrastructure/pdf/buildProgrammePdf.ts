/**
 * Génère la feuille de culte (PDF) d'un programme — mise en page tableau
 * (Élément | Réf | Tonalité | Officiant | Note) avec bandeaux de section.
 * Utilise pdf-lib + polices standard (Helvetica). Ne dépend PAS du dossier
 * ProPresenter : disponible même en mode dégradé.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Programme } from '../../domain/trame/types';
import { sanitizeWinAnsi as S } from './winAnsi';

const W = 595.28; // A4 portrait
const H = 841.89;
const M = 40;
const RIGHT = W - M;

// Colonnes (x de départ)
const X_TITLE = M;
const X_REF = 250;
const X_TON = 320;
const X_OFF = 370;
const X_NOTE = 460;

const PRIMARY = rgb(0.184, 0.333, 0.498);
const INK = rgb(0.1, 0.13, 0.16);
const MUTED = rgb(0.5, 0.55, 0.6);
const WHITE = rgb(1, 1, 1);
const RULE = rgb(0.85, 0.88, 0.91);

export async function buildProgrammePdf(programme: Programme): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const fit = (text: string, f: PDFFont, size: number, maxW: number): string => {
    let t = S(text);
    if (f.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1);
    return t + '...';
  };
  const ensure = (h: number) => {
    if (y - h < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };
  const text = (s: string, x: number, f: PDFFont, size: number, color = INK) =>
    page.drawText(s, { x, y: y - size, size, font: f, color });

  // En-tête
  text(fit(programme.titre || 'Programme du culte', bold, 18, RIGHT - M), X_TITLE, bold, 18);
  y -= 24;
  text(S(programme.date), X_TITLE, font, 11, MUTED);
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: RIGHT, y }, thickness: 0.7, color: RULE });
  y -= 16;

  // En-tête de colonnes
  text('ÉLÉMENT', X_TITLE, bold, 8, MUTED);
  text('RÉF', X_REF, bold, 8, MUTED);
  text('TON.', X_TON, bold, 8, MUTED);
  text('OFFICIANT', X_OFF, bold, 8, MUTED);
  text('NOTE', X_NOTE, bold, 8, MUTED);
  y -= 14;

  for (const section of programme.sections) {
    ensure(40);
    // Bandeau de section
    page.drawRectangle({ x: M, y: y - 18, width: RIGHT - M, height: 18, color: PRIMARY });
    page.drawText(fit(section.label, bold, 10, RIGHT - M - 14), {
      x: M + 8,
      y: y - 13,
      size: 10,
      font: bold,
      color: WHITE,
    });
    y -= 24;

    for (const item of section.items) {
      ensure(16);
      const isSong = item.type === 'song';
      text(fit(item.titre || '(sans titre)', isSong ? bold : font, 9.5, X_REF - X_TITLE - 6),
        X_TITLE, isSong ? bold : font, 9.5, isSong ? INK : rgb(0.32, 0.36, 0.42));
      if (item.ref) text(fit(item.ref, font, 9, X_TON - X_REF - 6), X_REF, font, 9, MUTED);
      if (item.tonalite) text(fit(item.tonalite, font, 9, X_OFF - X_TON - 6), X_TON, font, 9, INK);
      if (item.officiant) text(fit(item.officiant, font, 9, X_NOTE - X_OFF - 6), X_OFF, font, 9, INK);
      if (item.note) text(fit(item.note, font, 9, RIGHT - X_NOTE), X_NOTE, font, 9, MUTED);
      y -= 15;
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: RIGHT, y: y + 4 }, thickness: 0.4, color: RULE });
    }
    y -= 6;
  }

  return doc.save();
}

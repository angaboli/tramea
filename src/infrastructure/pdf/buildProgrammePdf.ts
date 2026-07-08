/**
 * Feuille de culte (PDF) — mise en page inspirée de la feuille traditionnelle :
 * bandeau d'en-tête (logo + titre centrés), bandeaux de section, tableau encadré
 * avec colonnes (Élément | Réf | Tonalité | Officiant | Remarques) et cellules
 * fusionnées quand l'élément n'est pas un chant.
 *
 * Police : Segoe UI (embarquée via /fonts) ; repli sur Helvetica si indisponible
 * (ex. tests). pdf-lib + fontkit. Ne dépend pas du dossier ProPresenter.
 */
import {
  PDFDocument,
  StandardFonts,
  PDFString,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Programme, TrameItem } from "../../domain/trame/types";
import { formatFrDate } from "../../domain/trame/formatDate";
import { sanitizeWinAnsi } from "./winAnsi";
import type { LyricGroup } from "../proplaylist/extractGroupedLyrics";

const W = 595.28; // A4
const H = 841.89;
const M = 28;
const RIGHT = W - M;

// Colonnes (x de gauche). Seule la frontière Élément|Contenu (X_REF) est
// fixe : au-delà, les colonnes (Réf/Tonalité/Officiant/Remarques) ne sont
// dessinées que si elles ont du contenu, réparties sur l'espace disponible —
// jamais de colonnes vides.
const X_NAME = M;
const X_REF = 233;

// Couleurs (inspirées de la référence)
const HEADER_BG = rgb(0.62, 0.8, 0.92); // bleu clair
const SECTION_BG = rgb(0.91, 0.66, 0.49); // saumon
const INK = rgb(0.1, 0.12, 0.16);

/** Convertit une couleur hex (#rrggbb) en couleur pdf-lib, ou null si invalide. */
function hexColor(hex?: string) {
  if (!hex) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Texte lisible (noir ou blanc) selon la luminance d'un fond pdf-lib. */
function readableInk(bg: { red: number; green: number; blue: number }) {
  const lum = 0.299 * bg.red + 0.587 * bg.green + 0.114 * bg.blue;
  return lum > 0.6 ? INK : rgb(1, 1, 1);
}
const BORDER = rgb(0.55, 0.58, 0.62);

const ROW_H = 26;
const SECTION_H = 22;
const HEADER_H = 46;


/** Police du PDF exporté : Segoe UI (historique) ou Libre Franklin (système Stitch). */
export type PdfFontChoice = "segoe" | "libre-franklin";

const FONT_FILES: Record<PdfFontChoice, { reg: string; bold: string }> = {
  segoe: { reg: "/fonts/SegoeUI.ttf", bold: "/fonts/SegoeUI-Bold.ttf" },
  "libre-franklin": {
    reg: "/fonts/LibreFranklin.ttf",
    bold: "/fonts/LibreFranklin-Bold.ttf",
  },
};

async function loadFonts(doc: PDFDocument, choice: PdfFontChoice = "segoe") {
  try {
    doc.registerFontkit(fontkit);
    const files = FONT_FILES[choice];
    const [reg, bold] = await Promise.all([
      fetch(files.reg).then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error()),
      ),
      fetch(files.bold).then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error()),
      ),
    ]);
    return {
      font: await doc.embedFont(reg, { subset: true }),
      bold: await doc.embedFont(bold, { subset: true }),
      custom: true,
    };
  } catch {
    return {
      font: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
      custom: false,
    };
  }
}

/** Convertit n'importe quelle image (webp/png/jpg) en octets PNG via canvas. */
async function blobToPng(blob: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponible");
  ctx.drawImage(bitmap, 0, 0);
  const b64 = canvas.toDataURL("image/png").split(",")[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  // pdf-lib n'embarque que PNG/JPG → on convertit au besoin.
  for (const name of ["/logo-lille.png", "/logo-eglise.webp", "/logo-eglise.png", "/logo-eglise.jpg"]) {
    try {
      const res = await fetch(name);
      if (!res.ok) continue;
      return await doc.embedPng(await blobToPng(await res.blob()));
    } catch {
      /* format suivant */
    }
  }
  return null;
}

export interface PdfOptions {
  /**
   * Paroles à annexer, groupées (Couplet/Refrain…), par ID d'item — pas par
   * nom de fichier .pro (deux items customSong peuvent partager le même
   * modèle et ne doivent pas se marcher dessus).
   */
  lyrics?: Record<string, LyricGroup[]>;
  /** Police du PDF : "segoe" (historique, par défaut) ou "libre-franklin". */
  font?: PdfFontChoice;
}

export async function buildProgrammePdf(
  programme: Programme,
  opts: PdfOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { font, bold, custom } = await loadFonts(doc, opts.font);
  const logo = await loadLogo(doc);
  const S = custom ? (s: string) => s : sanitizeWinAnsi;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const fit = (t: string, f: PDFFont, size: number, maxW: number): string => {
    let s = S(t);
    if (f.widthOfTextAtSize(s, size) <= maxW) return s;
    while (s.length > 1 && f.widthOfTextAtSize(s + "…", size) > maxW)
      s = s.slice(0, -1);
    return s + "…";
  };
  const textL = (
    s: string,
    x: number,
    yy: number,
    f: PDFFont,
    size: number,
    color = INK,
  ) => page.drawText(s, { x, y: yy, size, font: f, color });
  const textC = (
    s: string,
    x1: number,
    x2: number,
    yy: number,
    f: PDFFont,
    size: number,
  ) => {
    const t = fit(s, f, size, x2 - x1 - 8);
    const w = f.widthOfTextAtSize(t, size);
    page.drawText(t, {
      x: x1 + (x2 - x1 - w) / 2,
      y: yy,
      size,
      font: f,
      color: INK,
    });
  };
  const vline = (x: number, yTop: number, yBot: number) =>
    page.drawLine({
      start: { x, y: yTop },
      end: { x, y: yBot },
      thickness: 0.6,
      color: BORDER,
    });
  const hline = (yy: number) =>
    page.drawLine({
      start: { x: M, y: yy },
      end: { x: RIGHT, y: yy },
      thickness: 0.6,
      color: BORDER,
    });

  const LINK = rgb(0.18, 0.33, 0.5);
  // Lien cliquable aligné à droite de la cellule remarques (label "↧ Lien").
  const drawLink = (url: string, xRight: number, baseY: number) => {
    const label = "↧ Lien";
    const size = 9;
    const w = font.widthOfTextAtSize(label, size);
    const x = xRight - w - 6;
    page.drawText(label, { x, y: baseY, size, font, color: LINK });
    const annot = doc.context.register(
      doc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x, baseY - 2, x + w, baseY + size],
        Border: [0, 0, 0],
        A: doc.context.obj({ Type: "Action", S: "URI", URI: PDFString.of(url) }),
      }),
    );
    page.node.addAnnot(annot);
  };

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const ensure = (h: number) => {
    if (y - h < M) newPage();
  };

  function drawRow(item: TrameItem) {
    const top = y;
    const botY = y - ROW_H;
    const baseline = botY + (ROW_H - 10) / 2 + 1;
    const ref = item.ref?.trim() ?? "";
    const ton = item.tonalite?.trim() ?? "";
    const off = item.officiant?.trim() ?? "";
    const verset = item.verset?.trim() ?? "";
    const lien = item.lien?.trim() ?? "";
    const note = item.note?.trim() ?? "";
    const remark = [note, verset].filter(Boolean).join("  ·  ");
    const merged = !ref && !ton; // pas un chant → contenu centré fusionné

    hline(botY);
    vline(M, top, botY);
    vline(RIGHT, top, botY);
    vline(X_REF, top, botY);

    textL(
      fit(item.titre || "", bold, 10, X_REF - X_NAME - 12),
      X_NAME + 6,
      baseline,
      bold,
      10,
      hexColor(item.color) ?? INK,
    );

    // Seules les colonnes AVEC contenu sont dessinées, réparties sur l'espace
    // disponible — jamais de colonne vide. Chant : Réf | Tonalité | Officiant
    // | Remarques. Texte/moment (pas de réf/tonalité) : Officiant | Remarques
    // — dans une colonne séparée, pas fondus ensemble.
    const segments: { text: string; f: PDFFont; size: number }[] = [];
    if (merged) {
      if (off) segments.push({ text: off, f: font, size: 10 });
      if (remark) segments.push({ text: remark, f: font, size: 9.5 });
    } else {
      if (ref) segments.push({ text: ref, f: font, size: 10 });
      if (ton) segments.push({ text: ton, f: font, size: 10 });
      if (off) segments.push({ text: off, f: font, size: 9.5 });
      if (remark) segments.push({ text: remark, f: font, size: 9.5 });
    }

    const contentRight = lien ? RIGHT - 50 : RIGHT;
    const n = segments.length;
    if (n > 0) {
      const colW = (contentRight - X_REF) / n;
      segments.forEach((seg, i) => {
        const x1 = X_REF + i * colW;
        const x2 = X_REF + (i + 1) * colW;
        if (i > 0) vline(x1, top, botY);
        textC(seg.text, x1, x2, baseline, seg.f, seg.size);
      });
    }
    if (lien) drawLink(lien, RIGHT, baseline);
    y -= ROW_H;
  }

  // ── En-tête de page (au-dessus du tableau) : logo centré (le nom est dans le logo) ──
  const logoSize = 84;
  if (logo) {
    const sc = logoSize / Math.max(logo.width, logo.height);
    const dw = logo.width * sc;
    const dh = logo.height * sc;
    page.drawImage(logo, { x: M + (RIGHT - M - dw) / 2, y: y - dh, width: dw, height: dh });
    y -= dh + 14;
  }

  // ── Bandeau bleu (titre + date, sans logo ni nom d'église) ───────────────────
  const dateTxt = formatFrDate(programme.date);
  const t = programme.titre?.trim() || "";
  const occasion = !t ? dateTxt : t.includes(dateTxt) ? t : `${t} ${dateTxt}`;
  const titleBandColor = hexColor(programme.titleColor) ?? HEADER_BG;
  page.drawRectangle({ x: M, y: y - HEADER_H, width: RIGHT - M, height: HEADER_H, color: titleBandColor });
  page.drawRectangle({ x: M, y: y - HEADER_H, width: RIGHT - M, height: HEADER_H, borderColor: BORDER, borderWidth: 0.6 });
  const tSize = 15;
  const titleTxt = fit(occasion, bold, tSize, RIGHT - M - 24);
  const tW = bold.widthOfTextAtSize(titleTxt, tSize);
  page.drawText(titleTxt, { x: M + (RIGHT - M - tW) / 2, y: y - HEADER_H / 2 - tSize / 2 + 1, size: tSize, font: bold, color: readableInk(titleBandColor) });
  y -= HEADER_H;

  // Sections + lignes
  for (const section of programme.sections) {
    ensure(SECTION_H + ROW_H);
    const bandColor = hexColor(section.color) ?? SECTION_BG;
    page.drawRectangle({
      x: M,
      y: y - SECTION_H,
      width: RIGHT - M,
      height: SECTION_H,
      color: bandColor,
    });
    page.drawRectangle({
      x: M,
      y: y - SECTION_H,
      width: RIGHT - M,
      height: SECTION_H,
      borderColor: BORDER,
      borderWidth: 0.6,
    });
    const sl = fit(section.label, bold, 11, RIGHT - M - 12);
    const slw = bold.widthOfTextAtSize(sl, 11);
    page.drawText(sl, {
      x: M + (RIGHT - M - slw) / 2,
      y: y - SECTION_H / 2 - 4,
      size: 11,
      font: bold,
      color: readableInk(bandColor),
    });
    y -= SECTION_H;

    for (const item of section.items) {
      ensure(ROW_H);
      drawRow(item);
    }
  }

  // Annexe « Paroles » (lues depuis les .pro de l'utilisateur, si fournies).
  const lyrics = opts.lyrics ?? {};
  const wrap = (line: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = S(line).split(/\s+/);
    const out: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) <= maxW) cur = t;
      else {
        if (cur) out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [''];
  };

  const songs = programme.sections
    .flatMap((s) => s.items)
    .filter((it) => lyrics[it.id]?.length);

  if (songs.length) {
    newPage();
    // Marge horizontale supplémentaire (colonne plus étroite que le tableau
    // du programme) + taille de police réduite : la plupart des lignes
    // tiennent alors sur une seule ligne au lieu de déborder sur une 2e.
    // Le titre « Paroles » s'aligne sur cette même marge (pas sur M).
    const LM = M + 24;
    const maxW = RIGHT - 24 - LM;
    const LINE_SIZE = 10;
    const LINE_H = 15; // interligne (était 13 — un peu plus aéré)
    const blockHeight = (block: LyricGroup): number => {
      let h = block.groupe ? 16 : 0;
      for (const raw of block.lignes) h += wrap(raw, font, LINE_SIZE, maxW).length * LINE_H;
      return h + 18; // + espace après le groupe
    };

    page.drawText('Paroles', { x: LM, y: y - 18, size: 18, font: bold, color: INK });
    y -= 32;

    for (const it of songs) {
      const groups = lyrics[it.id];
      const heading = fit(it.ref ? `${it.titre} — ${it.ref}` : it.titre, bold, 13, maxW);

      // Si le 1er couplet ne tient pas avec le titre, les DEUX basculent sur
      // la page suivante — jamais un titre seul, orphelin, en bas de page.
      const firstBlockH = groups.length ? blockHeight(groups[0]) : 0;
      if (y - 40 - firstBlockH < M) newPage();

      // Paroles alignées à gauche (comme le reste du document).
      page.drawText(heading, { x: LM, y: y - 13, size: 13, font: bold, color: INK });
      y -= 24;

      groups.forEach((block, i) => {
        // Les groupes suivants (le 1er est déjà couvert par le titre ci-dessus) :
        // page suivante si le groupe ENTIER n'y tient pas.
        if (i > 0 && y - blockHeight(block) < M) newPage();

        // Étiquette de groupe (Couplet 1, Refrain…) — au lieu d'une diapo
        // anonyme, comme le montrent les feuilles de culte habituelles.
        if (block.groupe) {
          const label = fit(block.groupe, bold, 10, maxW);
          page.drawText(label, { x: LM, y: y - 10, size: 10, font: bold, color: INK });
          y -= 16;
        }
        for (const raw of block.lignes) {
          for (const line of wrap(raw, font, LINE_SIZE, maxW)) {
            if (y - LINE_SIZE < M) newPage(); // filet de sécurité (groupe > 1 page)
            page.drawText(line, { x: LM, y: y - 10, size: LINE_SIZE, font, color: INK });
            y -= LINE_H;
          }
        }
        y -= 18; // espace après chaque strophe/groupe
      });
      y -= 28; // espace après chaque chant
    }
  }

  return doc.save();
}

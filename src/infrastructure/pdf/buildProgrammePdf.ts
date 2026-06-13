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
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Programme, TrameItem } from "../../domain/trame/types";
import { sanitizeWinAnsi } from "./winAnsi";

const W = 595.28; // A4
const H = 841.89;
const M = 28;
const RIGHT = W - M;

// Colonnes (x de gauche)
const X_NAME = M;
const X_REF = 233;
const X_TON = 305;
const X_OFF = 372;
const X_REM = 446;

// Couleurs (inspirées de la référence)
const HEADER_BG = rgb(0.62, 0.8, 0.92); // bleu clair
const SECTION_BG = rgb(0.91, 0.66, 0.49); // saumon
const INK = rgb(0.1, 0.12, 0.16);
const BORDER = rgb(0.55, 0.58, 0.62);

const ROW_H = 26;
const SECTION_H = 22;
const HEADER_H = 46;

async function loadFonts(doc: PDFDocument) {
  try {
    doc.registerFontkit(fontkit);
    const [reg, bold] = await Promise.all([
      fetch("/fonts/SegoeUI.ttf").then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error()),
      ),
      fetch("/fonts/SegoeUI-Bold.ttf").then((r) =>
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
  // pdf-lib n'embarque que PNG/JPG → on convertit (le logo de l'église est en webp).
  for (const name of ["/logo-eglise.webp", "/logo-eglise.png", "/logo-eglise.jpg"]) {
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

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
function frDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
}

export async function buildProgrammePdf(
  programme: Programme,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { font, bold, custom } = await loadFonts(doc);
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
  const textL = (s: string, x: number, yy: number, f: PDFFont, size: number) =>
    page.drawText(s, { x, y: yy, size, font: f, color: INK });
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
    const note = item.note?.trim() ?? "";
    const merged = !ref && !ton; // pas un chant → contenu centré fusionné

    hline(botY);
    vline(M, top, botY);
    vline(RIGHT, top, botY);
    vline(X_REF, top, botY);
    if (!merged) {
      vline(X_TON, top, botY);
      vline(X_OFF, top, botY);
      vline(X_REM, top, botY);
    }

    textL(
      fit(item.titre || "", bold, 10, X_REF - X_NAME - 12),
      X_NAME + 6,
      baseline,
      bold,
      10,
    );

    if (merged) {
      const content = note || off;
      if (content) textC(content, X_REF, RIGHT, baseline, font, 10);
    } else {
      if (ref) textC(ref, X_REF, X_TON, baseline, bold, 10);
      if (ton) textC(ton, X_TON, X_OFF, baseline, font, 10);
      if (off) textC(off, X_OFF, X_REM, baseline, font, 9.5);
      if (note) textC(note, X_REM, RIGHT, baseline, font, 9.5);
    }
    y -= ROW_H;
  }

  // En-tête (bandeau bleu : logo + titre centrés)
  page.drawRectangle({
    x: M,
    y: y - HEADER_H,
    width: RIGHT - M,
    height: HEADER_H,
    color: HEADER_BG,
  });
  page.drawRectangle({
    x: M,
    y: y - HEADER_H,
    width: RIGHT - M,
    height: HEADER_H,
    borderColor: BORDER,
    borderWidth: 0.6,
  });
  const logoSize = 32;
  const gap = logo ? logoSize + 12 : 0;
  const tSize = 15;
  const title = fit(
    `${programme.titre || "Église Adventiste"}    ${frDate(programme.date)}`,
    bold,
    tSize,
    RIGHT - M - gap - 16,
  );
  const tW = bold.widthOfTextAtSize(title, tSize);
  const groupW = gap + tW;
  let gx = M + (RIGHT - M - groupW) / 2;
  const cy = y - HEADER_H / 2;
  if (logo) {
    const sc = logoSize / Math.max(logo.width, logo.height);
    const dw = logo.width * sc;
    const dh = logo.height * sc;
    page.drawImage(logo, { x: gx, y: cy - dh / 2, width: dw, height: dh });
    gx += gap;
  }
  page.drawText(title, {
    x: gx,
    y: cy - tSize / 2 + 1,
    size: tSize,
    font: bold,
    color: INK,
  });
  y -= HEADER_H;

  // Sections + lignes
  for (const section of programme.sections) {
    ensure(SECTION_H + ROW_H);
    page.drawRectangle({
      x: M,
      y: y - SECTION_H,
      width: RIGHT - M,
      height: SECTION_H,
      color: SECTION_BG,
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
      color: INK,
    });
    y -= SECTION_H;

    for (const item of section.items) {
      ensure(ROW_H);
      drawRow(item);
    }
  }

  return doc.save();
}

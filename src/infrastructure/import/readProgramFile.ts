/**
 * Lit un fichier programme (.md / .txt / .pdf) et le convertit en Programme.
 * - texte : décodage (UTF-16/UTF-8) + réparation mojibake ;
 * - PDF : extraction du texte via pdf.js (chargé à la demande).
 */
import type { Programme } from '../../domain/trame/types';
import { parseProgramText } from '../../domain/import/parseProgram';
import { parseProgramText as parseProgramTextAi } from './geminiProgramParser';
import { decodeProgram } from './decodeText';
import {
  joinFragments,
  rowsToLines,
  tableRowsFromPage,
  type PdfBox,
  type PdfTextItem,
} from './pdfTable';

const NEWLINE = String.fromCharCode(10);

type PdfJs = typeof import('pdfjs-dist');
type PdfPage = Awaited<ReturnType<Awaited<ReturnType<PdfJs['getDocument']>['promise']>['getPage']>>;

const mul = (a: number[], b: number[]) => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5],
];

/** Texte positionné + boîtes des traits/rectangles peints d'une page. */
async function pageGeometry(pdfjs: PdfJs, page: PdfPage): Promise<{ items: PdfTextItem[]; boxes: PdfBox[] }> {
  const content = await page.getTextContent();
  const items: PdfTextItem[] = [];
  for (const it of content.items as Array<{ str: string; transform: number[]; width: number; height: number }>) {
    if (!it.str) continue;
    items.push({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      size: Math.abs(it.transform[3]) || it.height || 10,
    });
  }

  const { OPS } = pdfjs;
  const fillOps = new Set<number>([OPS.fill, OPS.eoFill]);
  const strokeOps = new Set<number>([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const ol = await page.getOperatorList();
  const boxes: PdfBox[] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i];
    const args = ol.argsArray[i] as unknown;
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(args as number[], ctm);
    else if (fn === OPS.constructPath) {
      const [paintOp, pathArgs] = args as [number, ArrayLike<number>[]];
      const isFill = fillOps.has(paintOp);
      const isStroke = strokeOps.has(paintOp);
      if (!isFill && !isStroke) continue; // clip / endPath : pas peint
      const d = Array.from(pathArgs[0] ?? []);
      const xs: number[] = [];
      const ys: number[] = [];
      for (let k = 0; k < d.length; ) {
        const c = d[k];
        if (c === 0 || c === 1) { xs.push(d[k + 1]); ys.push(d[k + 2]); k += 3; }
        else if (c === 2) k += 7;
        else if (c === 3) k += 5;
        else k += 1;
      }
      if (!xs.length) continue;
      const px = xs.map((x, j) => ctm[0] * x + ctm[2] * ys[j] + ctm[4]);
      const py = xs.map((x, j) => ctm[1] * x + ctm[3] * ys[j] + ctm[5]);
      const b: PdfBox = { x0: Math.min(...px), x1: Math.max(...px), y0: Math.min(...py), y1: Math.max(...py) };
      const w = b.x1 - b.x0;
      const h = b.y1 - b.y0;
      if (w <= 3 || h <= 3) boxes.push(b); // trait fin (rempli ou tracé)
      else if (isStroke && !isFill) {
        // cellule tracée en rectangle : ses 4 côtés sont des bordures.
        boxes.push(
          { x0: b.x0, x1: b.x0, y0: b.y0, y1: b.y1 },
          { x0: b.x1, x1: b.x1, y0: b.y0, y1: b.y1 },
          { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y0 },
          { x0: b.x0, x1: b.x1, y0: b.y1, y1: b.y1 },
        );
      }
    }
  }
  return { items, boxes };
}

/**
 * Texte d'un PDF de programme. Si les pages contiennent un TABLEAU à bordures,
 * on le relit cellule par cellule (lignes `| a | b |`) et on s'arrête dès qu'une
 * page n'en a plus (annexe de paroles). Sinon : repli sur un regroupement par
 * lignes de texte.
 */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: { items: PdfTextItem[]; boxes: PdfBox[] }[] = [];
  for (let p = 1; p <= doc.numPages; p++) pages.push(await pageGeometry(pdfjs, await doc.getPage(p)));

  const tableLines: string[] = [];
  let headerSeen = false;
  let foundTable = false;
  for (const { items, boxes } of pages) {
    const rows = tableRowsFromPage(items, boxes);
    if (!rows) {
      if (foundTable) break; // fin du tableau : le reste = paroles
      continue;
    }
    foundTable = true;
    const r = rowsToLines(rows, headerSeen);
    headerSeen = r.headerSeen;
    tableLines.push(...r.lines);
  }
  if (foundTable) return tableLines.join(NEWLINE);

  // Repli : pas de tableau détecté → lignes de texte (même ordonnée approchée).
  const lines: string[] = [];
  for (const { items } of pages) {
    const rows = new Map<number, PdfTextItem[]>();
    for (const it of items) {
      const y = Math.round(it.y / 3);
      (rows.get(y) ?? rows.set(y, []).get(y)!).push(it);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags]) => lines.push(joinFragments(frags)));
  }
  return lines.join(NEWLINE);
}

export async function readProgramFile(file: File): Promise<Programme> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf =
    file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const text = isPdf ? await extractPdfText(bytes) : decodeProgram(bytes);

  try {
    return await parseProgramTextAi(text);
  } catch (error) {
    console.warn('Parsing IA échoué, fallback sur le parser classique :', error);
  }

  return parseProgramText(text);
}

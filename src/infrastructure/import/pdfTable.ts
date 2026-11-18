/**
 * Reconstruction d'un TABLEAU de programme à partir de la géométrie d'une page
 * PDF (texte positionné + traits de bordure). Un PDF n'a pas de notion de
 * cellule : lire le texte « à plat » mélange les colonnes, coupe les titres qui
 * passent sur 2 lignes et fait des fausses sections. Ici on retrouve les
 * rangées grâce aux traits horizontaux, les colonnes grâce aux traits
 * verticaux, puis on affecte chaque morceau de texte à sa cellule.
 *
 * PUR : aucune dépendance (pdf.js n'est utilisé que par l'appelant).
 */

export interface PdfTextItem {
  str: string;
  /** Origine gauche (x) et ligne de base (y), en points PDF (y vers le haut). */
  x: number;
  y: number;
  w: number;
  size: number;
}

/** Boîte englobante d'un trait/rectangle peint (fin ⇒ bordure de tableau). */
export interface PdfBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TableRow {
  cells: string[];
  /** Une seule cellule sur toute la largeur : bandeau de section ou d'en-tête. */
  merged: boolean;
}

const THIN = 3; // épaisseur max d'un trait de bordure (pt)

/** Regroupe des valeurs proches (tolérance `tol`) et renvoie leurs moyennes. */
function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && v - g[g.length - 1] <= tol) g.push(v);
    else groups.push([v]);
  }
  return groups.map((g) => g.reduce((s, v) => s + v, 0) / g.length);
}

/**
 * Colle des fragments d'une même ligne SANS espace parasite : pdf.js découpe
 * les petites capitales (« E » + « COLE ») en morceaux de tailles différentes ;
 * on n'insère un espace que s'il y a un vrai blanc entre deux morceaux.
 */
export function joinFragments(items: PdfTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = '';
  let prev: PdfTextItem | null = null;
  for (const it of sorted) {
    if (prev) {
      const gap = it.x - (prev.x + prev.w);
      const needsSpace =
        gap > Math.max(prev.size, it.size) * 0.15 && !/\s$/.test(out) && !/^\s/.test(it.str);
      if (needsSpace) out += ' ';
    }
    out += it.str;
    prev = it;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Texte d'un ensemble d'items : lignes (même y) puis lignes collées par un espace. */
export function itemsToText(items: PdfTextItem[]): string {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: PdfTextItem[][] = [];
  for (const it of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - it.y) < Math.max(it.size, 6) * 0.5) line.push(it);
    else lines.push([it]);
  }
  return lines.map(joinFragments).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Rangées d'un tableau de page, de haut en bas, ou `null` si la page ne
 * contient pas de tableau à bordures (≥ 2 rangées et ≥ 2 traits verticaux).
 */
export function tableRowsFromPage(
  items: PdfTextItem[],
  boxes: PdfBox[],
): TableRow[] | null {
  const hLines = boxes.filter((b) => b.y1 - b.y0 <= THIN && b.x1 - b.x0 >= 10);
  const vLines = boxes.filter((b) => b.x1 - b.x0 <= THIN && b.y1 - b.y0 >= 8);
  if (vLines.length < 2) return null;

  const ys = cluster(hLines.map((l) => (l.y0 + l.y1) / 2), 2).sort((a, b) => b - a);
  if (ys.length < 3) return null;

  const tableX0 = Math.min(...vLines.map((l) => (l.x0 + l.x1) / 2));
  const tableX1 = Math.max(...vLines.map((l) => (l.x0 + l.x1) / 2));

  const rows: TableRow[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const top = ys[i];
    const bottom = ys[i + 1];
    const height = top - bottom;
    if (height < 6) continue; // artefact de double trait

    // Colonnes : traits verticaux qui couvrent au moins la moitié de la rangée.
    const xs = cluster(
      vLines
        .filter((l) => Math.min(l.y1, top) - Math.max(l.y0, bottom) >= height * 0.5)
        .map((l) => (l.x0 + l.x1) / 2),
      4, // bordures doublées (≈2 pt d'écart) = une seule colonne
    );
    if (xs.length < 2) continue;

    const inRow = items.filter((it) => {
      const cy = it.y + it.size * 0.35;
      return cy <= top + 1 && cy >= bottom - 1 && it.x + it.w / 2 >= tableX0 - 2 && it.x + it.w / 2 <= tableX1 + 2;
    });

    const cells: string[] = [];
    for (let c = 0; c < xs.length - 1; c++) {
      const cellItems = inRow.filter((it) => {
        const cx = it.x + it.w / 2;
        return cx >= xs[c] - 1 && cx < xs[c + 1] + 1;
      });
      cells.push(itemsToText(cellItems));
    }
    // Bandeau (section / en-tête) : une seule cellule sur toute la largeur — soit
    // sans trait vertical intérieur, soit (bandeau noir/coloré dont les bordures
    // sont masquées) un texte unique qui enjambe une frontière de colonne.
    let merged = xs.length === 2;
    if (!merged && cells.filter(Boolean).length === 1 && inRow.length) {
      const minX = Math.min(...inRow.map((it) => it.x));
      const maxX = Math.max(...inRow.map((it) => it.x + it.w));
      merged = xs.slice(1, -1).some((b) => minX < b - 3 && maxX > b + 3);
      if (merged) {
        cells.length = 0;
        cells.push(itemsToText(inRow));
      }
    }
    rows.push({ cells, merged });
  }
  return rows.length >= 2 ? rows : null;
}

/**
 * Rangées → texte « markdown » compris par `parseProgramText` : le premier
 * bandeau (en-tête : église + date) tel quel, les bandeaux suivants en
 * MAJUSCULES (= sections), les autres rangées en lignes de tableau `| a | b |`.
 */
export function rowsToLines(rows: TableRow[], headerSeen = false): { lines: string[]; headerSeen: boolean } {
  const lines: string[] = [];
  let seen = headerSeen;
  for (const row of rows) {
    if (!row.cells.some(Boolean)) continue;
    if (row.merged) {
      const text = row.cells[0];
      if (!seen) {
        seen = true;
        lines.push(text);
      } else {
        lines.push(text.toUpperCase());
      }
      continue;
    }
    seen = true;
    lines.push(`| ${row.cells.join(' | ')} |`);
  }
  return { lines, headerSeen: seen };
}

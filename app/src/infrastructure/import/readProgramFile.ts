/**
 * Lit un fichier programme (.md / .txt / .pdf) et le convertit en Programme.
 * - texte : décodage (UTF-16/UTF-8) + réparation mojibake ;
 * - PDF : extraction du texte via pdf.js (chargé à la demande).
 */
import type { Programme } from '../../domain/trame/types';
import { parseProgramText } from '../../domain/import/parseProgram';
import { decodeProgram } from './decodeText';

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Regroupe les fragments par ligne (même position verticale approximative).
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as Array<{ str: string; transform: number[] }>) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5] / 3);
      const x = it.transform[4];
      (rows.get(y) ?? rows.set(y, []).get(y)!).push({ x, s: it.str });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags]) => {
        frags.sort((a, b) => a.x - b.x);
        lines.push(frags.map((f) => f.s).join(' '));
      });
  }
  return lines.join('\n');
}

export async function readProgramFile(file: File): Promise<Programme> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf =
    file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const text = isPdf ? await extractPdfText(bytes) : decodeProgram(bytes);
  return parseProgramText(text);
}

/**
 * Crée un chant personnalisé / medley en CLONANT une présentation `.pro`
 * existante (structure 100 % valide) et en remplaçant le texte de ses diapos
 * + le titre. Bien plus sûr que générer un `.pro` de zéro.
 *
 * Le texte AFFICHÉ d'une diapo se trouve dans un fragment RTF à
 *   f13 → f10 → f23 → f2 → f1 → f1 → f1 → f13 → f5
 * (et NON dans f10/f23/f2/f2, qui est un RTF de style constant). On remplace le
 * corps de texte (après le prologue de format `…\cbN`) et on réencode.
 */
import {
  walk,
  concat,
  encVarint,
  encVarintField,
  encBytesField,
  encStrField,
  encFixed32Field,
  type Field,
} from './protobuf';

const SLIDE_RTF_PATH = [10, 23, 2, 1, 1, 1, 13, 5];

function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}
function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** Échappe un texte pour RTF (accents en \uNNNN?, sauts de ligne en \par). */
export function escapeRtf(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (ch === '\n') out += '\\par ';
    else if (ch === '\r') continue;
    else if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
    else if (c < 128) out += ch;
    else out += `\\u${c}?`;
  }
  return out;
}

/** Remplace le corps de texte d'un fragment RTF de diapo. */
export function setRtfText(oldRtf: Uint8Array, text: string): Uint8Array {
  const s = latin1(oldRtf);
  const matches = [...s.matchAll(/\\cb\d+/g)];
  const end = s.lastIndexOf('}');
  if (matches.length === 0 || end < 0) return oldRtf; // format inconnu : on ne touche pas
  const last = matches[matches.length - 1];
  const bodyStart = last.index! + last[0].length;
  const prefix = s.slice(0, bodyStart);
  return latin1ToBytes(`${prefix} ${escapeRtf(text)}${s.slice(end)}`);
}

// ── Réencodage exact d'un champ tel quel ────────────────────────────────────
function reencode(f: Field): Uint8Array {
  if (f.wire === 0) return encVarintField(f.field, f.value as number);
  if (f.wire === 2) return encBytesField(f.field, f.value as Uint8Array);
  if (f.wire === 5) return encFixed32Field(f.field, f.value as Uint8Array);
  // wire 1 (fixed64)
  return concat([encVarint((f.field << 3) | 1), f.value as Uint8Array]);
}

/**
 * Applique `fn` au PREMIER champ length-delimited atteint via `path`
 * (champs simples) et réencode le message englobant.
 */
export function setAtPath(
  bytes: Uint8Array,
  path: readonly number[],
  fn: (leaf: Uint8Array) => Uint8Array,
): Uint8Array {
  const [head, ...rest] = path;
  let done = false;
  const parts = walk(bytes).map((f) => {
    if (!done && f.field === head && f.wire === 2) {
      done = true;
      const v = f.value as Uint8Array;
      const inner = rest.length ? setAtPath(v, rest, fn) : fn(v);
      return encBytesField(head, inner);
    }
    return reencode(f);
  });
  return concat(parts);
}

export interface CustomSong {
  title: string;
  /** Une entrée par diapo (texte de la diapo). */
  slides: string[];
}

/**
 * Reconstruit un `.pro` à partir d'un fichier de base : remplace le texte des
 * diapos (dans l'ordre) et le titre. Les diapos en trop gardent leur texte
 * d'origine ; s'il y a plus de strophes que de diapos, le surplus est ignoré.
 * Renvoie aussi le nombre de diapos retextées.
 */
export function retextPro(
  baseBytes: Uint8Array,
  song: CustomSong,
): { bytes: Uint8Array; used: number; slideCount: number } {
  const top = walk(baseBytes);
  const slideCount = top.filter((f) => f.field === 13 && f.wire === 2).length;
  let slideIdx = 0;
  let used = 0;

  const parts = top.map((f) => {
    // Diapos
    if (f.field === 13 && f.wire === 2) {
      const text = song.slides[slideIdx];
      slideIdx++;
      if (text === undefined) return reencode(f);
      used++;
      const slide = setAtPath(f.value as Uint8Array, SLIDE_RTF_PATH, (rtf) =>
        setRtfText(rtf, text),
      );
      return encBytesField(13, slide);
    }
    // Titre de présentation (f3 et f14 portent le nom)
    if ((f.field === 3 || f.field === 14) && f.wire === 2) {
      return encStrField(f.field, song.title);
    }
    return reencode(f);
  });

  return { bytes: concat(parts), used, slideCount };
}

import { describe, it, expect } from 'vitest';
import { rtfToText, extractLyrics } from './extractLyrics';

function bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

describe('rtfToText', () => {
  it('strip les en-têtes et garde le texte avec retours à la ligne', () => {
    const rtf = '{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}\\f0\\fs48 Alpha\\par Beta}';
    expect(rtfToText(rtf)).toBe('Alpha\nBeta');
  });

  it('décode les échappements hexadécimaux', () => {
    // \'e9 = é en cp1252/latin-1
    expect(rtfToText("{\\rtf1 caf\\'e9}")).toBe('café');
  });

  it('mappe les octets hauts Windows-1252 (guillemet courbe)', () => {
    // \'92 = apostrophe courbe ’ en cp1252 (illisible si décodé en latin-1)
    expect(rtfToText("{\\rtf1 L\\'92amour}")).toBe('L’amour');
  });

  it('saute les octets de repli après \\u selon \\uc', () => {
    // \uc1 : 1 octet de repli (« ? ») à ignorer après chaque \u.
    expect(rtfToText('{\\rtf1\\uc1 c\\u339?ur}')).toBe('cœur');
  });

  it('retire les octets de contrôle binaires résiduels', () => {
    expect(rtfToText('{\\rtf1 Gloire\\u0\x07 \x00à Dieu}')).toBe('Gloire à Dieu');
  });
});

describe('extractLyrics', () => {
  it('extrait les blocs de diapo dans l’ordre, sans doublon consécutif', () => {
    const pro = bytes(
      'xx{\\rtf1\\ansi Un\\par deux}yy{\\rtf1 Un\\par deux}zz{\\rtf1 trois}',
    );
    expect(extractLyrics(pro)).toEqual(['Un\ndeux', 'trois']);
  });

  it('retourne [] si aucun RTF', () => {
    expect(extractLyrics(bytes('aucun texte rtf ici'))).toEqual([]);
  });
});

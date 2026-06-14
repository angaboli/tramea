import { describe, it, expect } from 'vitest';
import { escapeRtf, setRtfText, setAtPath, retextPro } from './retextPro';
import { walk, get, getAll, encBytesField, encStrField, decodeUtf8 } from './protobuf';

function bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
const u = (v: ReturnType<typeof get>) => v as Uint8Array;

describe('escapeRtf', () => {
  it('échappe accents et sauts de ligne', () => {
    expect(escapeRtf('a\né')).toBe('a\\par \\u233?');
  });
  it('échappe les accolades et backslash', () => {
    expect(escapeRtf('{x}\\')).toBe('\\{x\\}\\\\');
  });
});

describe('setRtfText', () => {
  it('insère le texte après le prologue \\cbN', () => {
    const out = setRtfText(bytes('{\\rtf0\\fs100\\cb3}'), 'Bonjour');
    expect(new TextDecoder().decode(out)).toBe('{\\rtf0\\fs100\\cb3 Bonjour}');
  });
  it('laisse inchangé si format inconnu', () => {
    const inp = bytes('texte sans rtf');
    expect(setRtfText(inp, 'x')).toEqual(inp);
  });
});

describe('setAtPath', () => {
  it('remplace la feuille au bout du chemin', () => {
    const msg = encBytesField(10, encBytesField(23, encStrField(1, 'old')));
    const out = setAtPath(msg, [10, 23, 1], () => bytes('NEW'));
    const leaf = get(walk(u(get(walk(u(get(walk(out), 10))), 23))), 1);
    expect(decodeUtf8(u(leaf))).toBe('NEW');
  });
});

describe('retextPro', () => {
  // Construit une présentation synthétique : 2 diapos avec le chemin RTF + nom.
  const slide = (rtf: string) =>
    encBytesField(10, encBytesField(23, encBytesField(2, encBytesField(2, encBytesField(1, bytes(rtf))))));
  const base = new Uint8Array([
    ...encStrField(3, 'Ancien titre'),
    ...encBytesField(13, slide('{\\rtf0\\cb3}')),
    ...encBytesField(13, slide('{\\rtf0\\cb3}')),
    ...encStrField(14, 'Ancien titre'),
  ]);

  it('remplace le titre et le texte des diapos', () => {
    const { bytes: out, used, slideCount } = retextPro(base, {
      title: 'Medley du jour',
      slides: ['Premiere', 'Seconde'],
    });
    expect(slideCount).toBe(2);
    expect(used).toBe(2);

    const top = walk(out);
    expect(decodeUtf8(u(get(top, 3)))).toBe('Medley du jour');
    expect(decodeUtf8(u(get(top, 14)))).toBe('Medley du jour');

    const rtfOf = (sl: Uint8Array) => {
      let b = sl;
      for (const p of [10, 23, 2, 2, 1]) b = u(get(walk(b), p));
      return decodeUtf8(b);
    };
    const slides = getAll(top, 13).map((s) => rtfOf(u(s)));
    // Le texte injecté apparaît dans chaque diapo.
    expect(slides[0]).toContain('Premiere');
    expect(slides[1]).toContain('Seconde');
  });

  it('ignore le surplus de strophes (plus que de diapos)', () => {
    const { used } = retextPro(base, { title: 'x', slides: ['a', 'b', 'c'] });
    expect(used).toBe(2);
  });
});

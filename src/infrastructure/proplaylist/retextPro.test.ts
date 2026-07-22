import { describe, it, expect } from 'vitest';
import { escapeRtf, setRtfText, setAtPath, retextPro, regenerateUuids } from './retextPro';
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
  // Diapo synthétique avec le RTF au chemin affiché f10/f23/f2/f1/f1/f1/f13/f5.
  const slide = (rtf: string) => {
    let inner = bytes(rtf);
    for (const f of [5, 13, 1, 1, 1, 2, 23, 10]) inner = encBytesField(f, inner);
    return inner;
  };
  const base = new Uint8Array([
    ...encStrField(3, 'Ancien titre'),
    ...encBytesField(13, slide('{\\rtf0\\cb3}')),
    ...encBytesField(13, slide('{\\rtf0\\cb3}')),
    // f14 est un MESSAGE { f3: nom } dans le vrai format ProPresenter.
    ...encBytesField(14, encStrField(3, 'Ancien titre')),
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
    // f14 reste un message { f3: nom } : on vérifie le f3 interne.
    expect(decodeUtf8(u(get(walk(u(get(top, 14))), 3)))).toBe('Medley du jour');

    const rtfOf = (sl: Uint8Array) => {
      let b = sl;
      for (const p of [10, 23, 2, 1, 1, 1, 13, 5]) b = u(get(walk(b), p));
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

  it('vide les diapos de base EN TROP (pas de fuite du contenu cloné)', () => {
    // Base à 2 diapos porteuses de texte ; on ne fournit qu'UN texte (cas d'un
    // verset cloné depuis un cantique complet).
    const baseWithText = new Uint8Array([
      ...encStrField(3, 'J’entends ta douce voix'),
      ...encBytesField(13, slide('{\\rtf0\\cb3 PREMIER COUPLET DE BASE}')),
      ...encBytesField(13, slide('{\\rtf0\\cb3 SECOND COUPLET DE BASE}')),
    ]);
    const { bytes: out, used } = retextPro(baseWithText, {
      title: 'Jean 3:16',
      slides: ['Car Dieu a tant aimé le monde'],
    });
    expect(used).toBe(1);

    const top = walk(out);
    const rtfOf = (sl: Uint8Array) => {
      let b = sl;
      for (const p of [10, 23, 2, 1, 1, 1, 13, 5]) b = u(get(walk(b), p));
      return decodeUtf8(b);
    };
    const slides = getAll(top, 13).map((s) => rtfOf(u(s)));
    expect(slides[0]).toContain('Car Dieu a tant aim'); // texte du verset
    expect(slides[1]).not.toContain('COUPLET'); // diapo en trop vidée → pas de fuite
  });

  it('régénère les UUID (identité fraîche) pour éviter tout conflit ProPresenter', () => {
    // Deux champs distincts (f2 = identité, f10 = référence média) partageant le
    // MÊME uuid d'origine, plus un uuid nul — comme dans un vrai .pro cloné.
    const baseWithUuid = new Uint8Array([
      ...encStrField(2, 'id=ad9526ea-8687-45d2-876d-d22bc8c03c10'),
      ...encStrField(10, 'media=ad9526ea-8687-45d2-876d-d22bc8c03c10'),
      ...encStrField(11, 'nil=00000000-0000-0000-0000-000000000000'),
    ]);
    const a = retextPro(baseWithUuid, { title: 'A', slides: [] });
    const b = retextPro(baseWithUuid, { title: 'B', slides: [] });
    const textA = new TextDecoder('latin1').decode(a.bytes);
    const textB = new TextDecoder('latin1').decode(b.bytes);

    // Le UUID nul (valeur sémantique) n'est jamais touché.
    expect(textA).toContain('00000000-0000-0000-0000-000000000000');
    expect(textB).toContain('00000000-0000-0000-0000-000000000000');

    // Le même UUID d'origine (répété 2x dans le fichier) devient le MÊME
    // nouvel UUID partout (cohérence interne préservée).
    const idsA = [...textA.matchAll(/id=([0-9a-f-]{36})/g)].map((m) => m[1]);
    const mediaA = [...textA.matchAll(/media=([0-9a-f-]{36})/g)].map((m) => m[1]);
    expect(idsA[0]).toBe(mediaA[0]);
    expect(idsA[0]).not.toBe('ad9526ea-8687-45d2-876d-d22bc8c03c10');

    // Deux appels sur le MÊME modèle (deux items clonés du même .pro) reçoivent
    // des identités DIFFÉRENTES — sinon collision d'identité dans ProPresenter.
    expect(textA).not.toBe(textB);
    const idsB = [...textB.matchAll(/id=([0-9a-f-]{36})/g)].map((m) => m[1]);
    expect(idsA[0]).not.toBe(idsB[0]);
  });

  it('regenerateUuids préserve la longueur (UUID → UUID, 36 caractères)', () => {
    const withUuid = new TextEncoder().encode(
      'x=ad9526ea-8687-45d2-876d-d22bc8c03c10 y',
    );
    expect(regenerateUuids(withUuid).length).toBe(withUuid.length);
  });
});

describe('regenerateUuids', () => {
  it('ne modifie rien si aucun UUID présent', () => {
    const input = new TextEncoder().encode('rien à voir ici');
    expect(Array.from(regenerateUuids(input))).toEqual(Array.from(input));
  });
});

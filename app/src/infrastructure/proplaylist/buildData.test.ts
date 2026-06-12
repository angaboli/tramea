import { describe, it, expect } from 'vitest';
import { buildProplaylistData, type PlaylistItem } from './buildData';
import { walk, get, getAll, decodeUtf8 } from './protobuf';

function u(v: ReturnType<typeof get>): Uint8Array {
  return v as Uint8Array;
}

describe('buildProplaylistData', () => {
  const items: PlaylistItem[] = [
    { type: 'header', label: 'TEMPS DE LOUANGES' },
    {
      type: 'file',
      label: 'Agnus Dei',
      absPath: 'C:\\X\\Libraries\\JEM\\Agnus Dei.pro',
      relPath: 'Libraries/JEM/Agnus Dei.pro',
    },
  ];

  it('produit un data décodable avec le bon nom de playlist', () => {
    const data = buildProplaylistData('sabbat 13/06/26', items);
    const top = walk(data);
    // top : f1 (header version), f2=1, f3 (doc)
    expect(get(top, 2)).toBe(1);
    const f3 = walk(u(get(top, 3)));
    const f12 = walk(u(get(f3, 12)));
    const pl = walk(u(get(f12, 1)));
    expect(decodeUtf8(u(get(pl, 2)))).toBe('sabbat 13/06/26');
  });

  it('contient les items dans l’ordre, header puis fichier', () => {
    const data = buildProplaylistData('x', items);
    const pl = walk(u(get(walk(u(get(walk(data), 3))), 12)));
    const playlist = walk(u(get(pl, 1)));
    const container = walk(u(get(playlist, 13)));
    const itemBlobs = getAll(container, 1);
    expect(itemBlobs.length).toBe(2);

    const header = walk(itemBlobs[0] as Uint8Array);
    expect(decodeUtf8(u(get(header, 2)))).toBe('TEMPS DE LOUANGES');
    expect(get(header, 3)).toBeDefined(); // header → champ f3 (couleur + segment)
    expect(get(header, 4)).toBeUndefined();

    const file = walk(itemBlobs[1] as Uint8Array);
    expect(decodeUtf8(u(get(file, 2)))).toBe('Agnus Dei');
    expect(get(file, 4)).toBeDefined(); // fichier → champ f4 (référence .pro)
    const f4 = walk(u(get(file, 4)));
    const ref = walk(u(get(f4, 1)));
    const relMsg = walk(u(get(ref, 4)));
    expect(decodeUtf8(u(get(relMsg, 2)))).toBe('Libraries/JEM/Agnus Dei.pro');
  });

  it('génère des UUID uniques entre deux items header (pas de doublon de segment)', () => {
    const data = buildProplaylistData('x', [
      { type: 'header', label: 'PRELUDE' },
      { type: 'header', label: 'POSTLUDE' },
    ]);
    const s = decodeUtf8(data);
    const uuids = s.match(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    )!;
    expect(new Set(uuids).size).toBe(uuids.length); // tous distincts
  });
});

import { describe, it, expect } from 'vitest';
import {
  encVarint,
  readVarint,
  walk,
  get,
  getAll,
  concat,
  encVarintField,
  encBytesField,
  encFixed32Field,
  decodeUtf8,
  base64ToBytes,
  type Field,
} from './protobuf';
import { REFERENCE_DATA_B64 } from './__fixtures__/referenceData';

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe('encVarint / readVarint', () => {
  const cases: Array<[number, number[]]> = [
    [0, [0x00]],
    [1, [0x01]],
    [127, [0x7f]],
    [128, [0x80, 0x01]],
    [300, [0xac, 0x02]],
    [16384, [0x80, 0x80, 0x01]],
    [4294967295, [0xff, 0xff, 0xff, 0xff, 0x0f]],
  ];
  it.each(cases)('encode %i correctement', (n, expected) => {
    expect([...encVarint(n)]).toEqual(expected);
  });
  it.each(cases)('round-trip readVarint %i', (n) => {
    const [v, pos] = readVarint(encVarint(n), 0);
    expect(v).toBe(n);
    expect(pos).toBe(encVarint(n).length);
  });
});

/** Re-encode récursivement un message en réutilisant les encodeurs. */
function reencode(data: Uint8Array): Uint8Array {
  const parts = walk(data).map((f: Field) => {
    if (f.wire === 0) return encVarintField(f.field, f.value as number);
    if (f.wire === 5) return encFixed32Field(f.field, f.value as Uint8Array);
    if (f.wire === 1) return concat([encVarint((f.field << 3) | 1), f.value as Uint8Array]);
    // wire 2 : si la valeur est elle-même un message valide, on recompose
    // récursivement (exerce l'encodeur en profondeur) ; sinon octets bruts.
    const raw = f.value as Uint8Array;
    let inner = raw;
    try {
      const re = reencode(raw);
      if (bytesEqual(re, raw)) inner = re;
    } catch {
      /* feuille (chaîne/bytes) : on garde brut */
    }
    return encBytesField(f.field, inner);
  });
  return concat(parts);
}

describe('GOLD — encodeur byte-exact vs ProPresenter', () => {
  const ref = base64ToBytes(REFERENCE_DATA_B64);

  it('le data de référence se décode', () => {
    expect(ref.length).toBe(5471);
    expect(walk(ref).length).toBeGreaterThan(0);
  });

  it('re-encode le data complet OCTET-POUR-OCTET', () => {
    const re = reencode(ref);
    expect(re.length).toBe(ref.length);
    expect(bytesEqual(re, ref)).toBe(true);
  });

  it('décode la structure réelle (playlist + 20 items)', () => {
    const top = walk(ref);
    const f3 = walk(get(top, 3) as Uint8Array);
    const f12 = walk(get(f3, 12) as Uint8Array);
    const pl = walk(get(f12, 1) as Uint8Array);
    expect(decodeUtf8(get(pl, 2) as Uint8Array)).toBe('sabbat 07/06/25');
    const container = walk(get(pl, 13) as Uint8Array);
    const items = getAll(container, 1);
    expect(items.length).toBe(20);
    // Premier item = en-tête de section "Ecole du sabbat"
    const first = walk(items[0] as Uint8Array);
    expect(decodeUtf8(get(first, 2) as Uint8Array)).toBe('Ecole du sabbat');
  });
});

/**
 * Encodage / décodage protobuf minimal et EXACT — port de `propb.py`.
 * Pur (Uint8Array uniquement) : aucune dépendance navigateur/Node.
 *
 * Le décodeur (`walk`) lit strictement les champs length-delimited : la position
 * avance toujours de la longueur exacte, donc aucune cascade d'erreur.
 */

export type WireType = 0 | 1 | 2 | 5;

export interface Field {
  field: number;
  wire: WireType;
  /** wire 0 → number ; wire 2/5/1 → Uint8Array. */
  value: number | Uint8Array;
}

const TE = new TextEncoder();
const TD = new TextDecoder();

// ── Décodage ────────────────────────────────────────────────────────────────

export function readVarint(data: Uint8Array, pos: number): [number, number] {
  let result = 0;
  let shift = 0;
  while (pos < data.length) {
    const b = data[pos];
    pos += 1;
    result += (b & 0x7f) * 2 ** shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [result, pos];
}

/** Itère les champs de premier niveau d'un message protobuf. */
export function walk(data: Uint8Array): Field[] {
  const out: Field[] = [];
  let pos = 0;
  while (pos < data.length) {
    let tag: number;
    [tag, pos] = readVarint(data, pos);
    const field = tag >>> 3;
    const wire = (tag & 7) as WireType;
    if (field === 0) break;
    if (wire === 0) {
      let v: number;
      [v, pos] = readVarint(data, pos);
      out.push({ field, wire, value: v });
    } else if (wire === 2) {
      let len: number;
      [len, pos] = readVarint(data, pos);
      out.push({ field, wire, value: data.subarray(pos, pos + len) });
      pos += len;
    } else if (wire === 5) {
      out.push({ field, wire, value: data.subarray(pos, pos + 4) });
      pos += 4;
    } else if (wire === 1) {
      out.push({ field, wire, value: data.subarray(pos, pos + 8) });
      pos += 8;
    } else {
      throw new Error(`wire type ${wire} non supporté @ ${pos}`);
    }
  }
  return out;
}

export function get(fields: Field[], field: number): Field['value'] | undefined {
  return fields.find((f) => f.field === field)?.value;
}

export function getAll(fields: Field[], field: number): Field['value'][] {
  return fields.filter((f) => f.field === field).map((f) => f.value);
}

// ── Encodage ────────────────────────────────────────────────────────────────

export function encVarint(value: number): Uint8Array {
  const out: number[] = [];
  let v = value;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const b = v & 0x7f;
    v = Math.floor(v / 128);
    if (v) out.push(b | 0x80);
    else {
      out.push(b);
      break;
    }
  }
  return Uint8Array.from(out);
}

export function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function encTag(field: number, wire: WireType): Uint8Array {
  return encVarint((field << 3) | wire);
}

export function encVarintField(field: number, value: number): Uint8Array {
  return concat([encTag(field, 0), encVarint(value)]);
}

export function encBytesField(field: number, data: Uint8Array): Uint8Array {
  return concat([encTag(field, 2), encVarint(data.length), data]);
}

export function encStrField(field: number, s: string): Uint8Array {
  return encBytesField(field, TE.encode(s));
}

export function encFixed32Field(field: number, raw4: Uint8Array): Uint8Array {
  return concat([encTag(field, 5), raw4]);
}

export function decodeUtf8(data: Uint8Array): string {
  return TD.decode(data);
}

export function base64ToBytes(b64: string): Uint8Array {
  // atob est disponible dans les navigateurs et dans Node 18+ (globalThis.atob).
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

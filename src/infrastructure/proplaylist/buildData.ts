/**
 * Construction du fichier `data` d'un .proPlaylist (port de `export_proplaylist.py`).
 * Produit un protobuf structurellement identique à l'export natif ProPresenter
 * (validé par le GOLD test de `protobuf.test.ts`). Pur — pas d'I/O ici.
 */
import {
  encVarintField,
  encBytesField,
  encStrField,
  concat,
  base64ToBytes,
} from './protobuf';
import { HEADER_F1_B64, SEGMENT_TEMPLATE_B64, SECTION_COLORS_B64 } from './templates';

const HEADER_F1 = base64ToBytes(HEADER_F1_B64);
const SEGMENT = base64ToBytes(SEGMENT_TEMPLATE_B64);
const COLORS: Record<string, Uint8Array> = Object.fromEntries(
  Object.entries(SECTION_COLORS_B64).map(([k, v]) => [k, base64ToBytes(v)]),
);

const UUID_RE =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

function newUuid(): string {
  return crypto.randomUUID();
}

/** Régénère chaque UUID distinct (longueur fixe 36 → patch d'octets sûr). */
function regenUuids(data: Uint8Array): Uint8Array {
  let s = '';
  for (let i = 0; i < data.length; i++) s += String.fromCharCode(data[i]);
  const map = new Map<string, string>();
  s = s.replace(UUID_RE, (m) => {
    if (!map.has(m)) map.set(m, newUuid());
    return map.get(m)!;
  });
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Libellé de section (normalisé) → nom de gabarit couleur.
const COLOR_TABLE: Record<string, string> = {
  'ecole du sabbat': 'Ecole du sabbat',
  annonces: 'ANNONCES',
  intercession: 'INTERCESSION',
  prelude: 'PRELUDE',
  'pre culte': 'PRE-CULTE',
  'culte d adoration': 'PRE-CULTE',
  'temps de louanges': 'TEMPS DE LOUANGES',
  'priere a genoux': 'PRIERE A GENOUX',
  'service de fidelite': 'SERVICE DE FIDELITE',
  'message des enfants': 'MESSAGE DES ENFANTS',
  'message pour les enfants': 'MESSAGE DES ENFANTS',
  meditation: 'MEDITATION',
  'post culte': 'POST-CULTE',
  postlude: 'POSTLUDE',
};

function resolveColor(label: string): Uint8Array {
  const name = COLOR_TABLE[norm(label)];
  if (name && COLORS[name]) return COLORS[name];
  return COLORS['TEMPS DE LOUANGES'] ?? new Uint8Array();
}

function uuidField(): Uint8Array {
  return encBytesField(1, encStrField(1, newUuid()));
}

function buildHeaderItem(label: string, color: Uint8Array): Uint8Array {
  const seg = regenUuids(SEGMENT);
  const f3 = concat([encBytesField(1, color), encBytesField(2, seg)]);
  const item = concat([uuidField(), encStrField(2, label), encBytesField(3, f3)]);
  return encBytesField(1, item);
}

function buildFileItem(label: string, absPath: string, relPath: string): Uint8Array {
  const fileRef = concat([
    encStrField(1, absPath),
    encVarintField(3, 2),
    encBytesField(4, concat([encVarintField(1, 10), encStrField(2, relPath)])),
  ]);
  const f4 = concat([
    encBytesField(1, fileRef),
    encBytesField(2, encStrField(1, newUuid())),
  ]);
  const item = concat([uuidField(), encStrField(2, label), encBytesField(4, f4)]);
  return encBytesField(1, item);
}

export type PlaylistItem =
  | { type: 'header'; label: string }
  | { type: 'file'; label: string; absPath: string; relPath: string };

/** Construit le `data` complet d'un .proPlaylist. */
export function buildProplaylistData(
  playlistName: string,
  items: PlaylistItem[],
): Uint8Array {
  const blobs = items.map((it) =>
    it.type === 'header'
      ? buildHeaderItem(it.label, resolveColor(it.label))
      : buildFileItem(it.label, it.absPath, it.relPath),
  );
  const container = concat(blobs);
  const playlist = concat([
    uuidField(),
    encStrField(2, playlistName),
    encBytesField(13, container),
  ]);
  const doc = concat([
    uuidField(),
    encVarintField(3, 4),
    encBytesField(12, encBytesField(1, playlist)),
  ]);
  return concat([encBytesField(1, HEADER_F1), encVarintField(2, 1), encBytesField(3, doc)]);
}

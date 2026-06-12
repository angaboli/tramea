/**
 * Domaine — bibliothèque de chants.
 * Pur : parsing du nom de fichier `.pro` (titre + référence de recueil) et
 * recherche. Aucune dépendance disque/React.
 */

export interface LibrarySong {
  /** Nom de fichier .pro (basename), ex "Agnus Dei - JEM 724 1.pro". */
  name: string;
  /** Chemin relatif au dossier ProPresenter. */
  relPath: string;
}

export interface ParsedSong {
  titre: string;
  ref: string; // ex "JEM 724" ; vide si absent
}

const REF_RE =
  /\b(H\s*&\s*L|H&L|HL|JEM\s*KIDS|JEMK|JEM|ATG|DLG|AF|UAGF|EDS)\s*[-–]?\s*(\d{1,4})\b/i;

function normalizeRefPrefix(p: string): string {
  const up = p.toUpperCase().replace(/\s+/g, '');
  if (up === 'HL' || up === 'H&L') return 'H&L';
  if (up === 'JEMKIDS' || up === 'JEMK') return 'JEM KIDS';
  return up;
}

/** Extrait le titre lisible et la référence depuis un nom de fichier .pro. */
export function parseSongFileName(name: string): ParsedSong {
  const base = name.replace(/\.pro$/i, '');
  const m = base.match(REF_RE);
  const ref = m ? `${normalizeRefPrefix(m[1])} ${m[2]}` : '';
  let titre = base;
  if (m) titre = titre.replace(m[0], ' ');
  titre = titre
    .replace(/\s*[-–]\s*$/g, '') // tiret final
    .replace(/\s*\.\.\.\s*/g, ' ') // points de suspension
    .replace(/\s*\d+\s*$/g, '') // numéro de doublon final ("... 1")
    .replace(/[-–\s]+$/g, '')
    .replace(/^[-–\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { titre: titre || base.trim(), ref };
}

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Recherche par tokens (tous présents). Préfixes classés en premier. */
export function searchSongs(
  songs: readonly LibrarySong[],
  query: string,
  limit = 30,
): LibrarySong[] {
  const q = normalizeSearch(query);
  if (!q) return songs.slice(0, limit);
  const tokens = q.split(' ');
  const scored: Array<{ s: LibrarySong; score: number }> = [];
  for (const s of songs) {
    const hay = normalizeSearch(s.name);
    if (!tokens.every((t) => hay.includes(t))) continue;
    const score = hay.startsWith(tokens[0]) ? 0 : 1;
    scored.push({ s, score });
  }
  scored.sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name));
  return scored.slice(0, limit).map((x) => x.s);
}

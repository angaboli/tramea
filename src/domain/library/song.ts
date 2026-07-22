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

/**
 * Trouve un chant dont le nom de fichier (sans extension) correspond EXACTEMENT
 * (accents/casse/ponctuation ignorés) à l'une des `matchKeys`, dans l'ordre
 * (la première clé qui correspond gagne). Utilisé pour pré-lier automatiquement
 * les diapos-titres récurrentes (Prélude, Bénédiction…) à leur `.pro`.
 * Correspondance EXACTE (pas floue) pour éviter les faux positifs
 * (ex. ne pas confondre « Prière » et « Prière à genoux »).
 */
export function findSongByExactName(
  songs: readonly LibrarySong[],
  matchKeys: readonly string[] | undefined,
): LibrarySong | undefined {
  if (!matchKeys?.length) return undefined;
  const byNormalized = new Map(
    songs.map((s) => [normalizeSearch(s.name.replace(/\.pro$/i, '')), s] as const),
  );
  for (const key of matchKeys) {
    const found = byNormalized.get(normalizeSearch(key));
    if (found) return found;
  }
  return undefined;
}

/**
 * Trouve le fichier `.pro` le PLUS probable pour un chant scrappé (import PDF).
 * Stratégie AGRESSIVE (on préfère lier un candidat plausible que laisser vide) :
 *   1. par RÉFÉRENCE de recueil (H&L 496, JEM 724…) — signal fort et quasi
 *      unique : si un fichier a la même ref, on le retient direct ;
 *   2. sinon, repli FLOU sur le titre (meilleur candidat de `searchSongs`),
 *      même approximatif — quitte à se tromper, l'utilisateur corrige à la main.
 * Renvoie `undefined` seulement si la bibliothèque ne donne AUCUN candidat.
 */
/**
 * Correspondances chant → fichier `.pro` EXPLICITES, pour les cas où ni la
 * référence ni le titre ne suffisent (ex. le « chant d'envoi » dont le fichier
 * est daté). Le fichier n'est retenu que s'il existe RÉELLEMENT dans la
 * bibliothèque connectée. Enrichir à la demande.
 */
interface SongAlias {
  /** Tous ces tokens (normalisés) doivent figurer dans le titre de l'item. */
  tokens: readonly string[];
  /** Nom de fichier .pro visé (doit exister dans la bibliothèque). */
  proFile: string;
}
const SONG_ALIASES: readonly SongAlias[] = [
  // Chant d'envoi « Seigneur attire / Quel repos » → diapo dédiée datée.
  { tokens: ['seigneur', 'attire', 'quel', 'repos'], proFile: "Chant d'envoie 2026-03.pro" },
];

/**
 * Première diapo (ordre alphabétique) dont le nom de fichier COMMENCE par l'un
 * des préfixes (accents/casse ignorés). Sert aux moments à suffixe variable
 * (« TEMOIGNAGE - <nom> », « CHANT SPECIAL - <nom> ») pour éviter un item vide.
 */
export function findSongByPrefix(
  songs: readonly LibrarySong[],
  prefixes: readonly string[] | undefined,
): LibrarySong | undefined {
  if (!prefixes?.length) return undefined;
  for (const p of prefixes) {
    const key = normalizeSearch(p);
    if (!key) continue;
    const hits = songs.filter((s) =>
      normalizeSearch(s.name.replace(/\.pro$/i, '')).startsWith(key),
    );
    if (hits.length) return [...hits].sort((a, b) => a.name.localeCompare(b.name))[0];
  }
  return undefined;
}

export function matchSongInLibrary(
  songs: readonly LibrarySong[],
  song: { titre?: string; ref?: string },
): LibrarySong | undefined {
  const titre = song.titre?.trim();

  // 1. Alias explicite (le titre contient tous les tokens) — priorité maximale.
  if (titre) {
    const t = normalizeSearch(titre);
    for (const a of SONG_ALIASES) {
      if (!a.tokens.every((tok) => t.includes(tok))) continue;
      const want = normalizeSearch(a.proFile.replace(/\.pro$/i, ''));
      const file = songs.find((s) => normalizeSearch(s.name.replace(/\.pro$/i, '')) === want);
      if (file) return file;
    }
  }

  const titleTokens = titre ? normalizeSearch(titre).split(' ').filter(Boolean) : [];
  const matchesTitle = (s: LibrarySong): boolean => {
    if (!titleTokens.length) return false;
    const hay = normalizeSearch(s.name);
    return titleTokens.every((t) => hay.includes(t));
  };

  const wantRef = normalizeSearch(song.ref ?? '');
  if (wantRef) {
    const byRef = songs.filter((s) => normalizeSearch(parseSongFileName(s.name).ref) === wantRef);
    if (byRef.length === 1) return byRef[0];
    if (byRef.length > 1) {
      // Plusieurs fichiers pour la même référence (doublons, versions
      // « Instrumental »…) : on départage par le titre, sinon le premier.
      return byRef.find(matchesTitle) ?? byRef[0];
    }
  }

  // Pas de référence exploitable : repli flou sur le titre (meilleur candidat).
  return titre ? searchSongs(songs, titre, 1)[0] : undefined;
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

/**
 * Extraction des paroles d'un `.pro`, organisées par GROUPE (Couplet 1,
 * Refrain, Introduction…) — la fonctionnalité de groupage native de
 * ProPresenter. Format déchiffré et vérifié sur de vrais fichiers :
 *
 *   - Champ racine `f12` (répété) = un groupe : { f1: { f2: nom },
 *     f2 (répété) : { f1: <uuid diapo membre> } }
 *   - Chaque diapo (`f13`) porte sa propre identité à `f1.f1` (uuid, chaîne
 *     UTF-8 protobuf normale — PAS le RTF, qui a son propre encodage).
 *
 * En croisant les deux, on sait pour chaque diapo à quel groupe elle
 * appartient, dans l'ordre réel du chant (une répétition du refrain apparaît
 * à chaque occurrence, pas dédupliquée).
 *
 * Si le fichier n'a pas de groupes (rare), `groupe` est undefined pour toutes
 * les diapos — l'appelant peut alors se rabattre sur un simple texte continu.
 */
import { walk, decodeUtf8 } from './protobuf';
import { latin1, rtfToText, keepLyricLines } from './extractLyrics';

const SLIDE_UUID_PATH = [1, 1];
const SLIDE_RTF_PATH = [10, 23, 2, 1, 1, 1, 13, 5];

export interface LyricGroup {
  /** Nom du groupe (« Couplet 1 », « Refrain »…), ou undefined si non groupé. */
  groupe?: string;
  /** Lignes de paroles de cette diapo (nettoyées). */
  lignes: string[];
}

function getAtPath(buf: Uint8Array, path: readonly number[]): Uint8Array | null {
  let cur = buf;
  for (const head of path) {
    const f = walk(cur).find((x) => x.field === head && x.wire === 2);
    if (!f) return null;
    cur = f.value as Uint8Array;
  }
  return cur;
}

/** Construit la map uuid de diapo → nom de groupe, depuis les champs f12 racine. */
function buildSlideToGroup(top: ReturnType<typeof walk>): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of top) {
    if (g.field !== 12 || g.wire !== 2) continue;
    const gf = walk(g.value as Uint8Array);
    const f1 = gf.find((x) => x.field === 1 && x.wire === 2);
    if (!f1) continue;
    const nameField = walk(f1.value as Uint8Array).find((x) => x.field === 2 && x.wire === 2);
    if (!nameField) continue;
    const name = decodeUtf8(nameField.value as Uint8Array).trim();
    if (!name) continue;
    for (const member of gf) {
      if (member.field !== 2 || member.wire !== 2) continue;
      const uuidField = walk(member.value as Uint8Array).find((x) => x.field === 1 && x.wire === 2);
      if (!uuidField) continue;
      map.set(decodeUtf8(uuidField.value as Uint8Array).trim(), name);
    }
  }
  return map;
}

/** « Introduction » ne fait que répéter le titre déjà affiché en en-tête : redondant. */
function isIntroduction(name: string | undefined): boolean {
  return !!name && /^introduction$/i.test(name.trim());
}

/**
 * Fusionne les diapos CONSÉCUTIVES qui partagent le MÊME nom de groupe en un
 * seul paragraphe (un couplet réparti sur plusieurs diapos doit s'afficher
 * comme un seul couplet, pas répété diapo par diapo). Les diapos SANS groupe
 * (undefined) ne sont jamais fusionnées entre elles — chacune reste son
 * propre paragraphe, comme avant.
 */
function mergeConsecutiveGroups(entries: readonly LyricGroup[]): LyricGroup[] {
  const out: LyricGroup[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (e.groupe && last?.groupe === e.groupe) {
      last.lignes = [...last.lignes, ...e.lignes];
    } else {
      out.push({ groupe: e.groupe, lignes: [...e.lignes] });
    }
  }
  return out;
}

/**
 * Paroles groupées d'un `.pro` : une entrée par GROUPE (Couplet 1, Refrain…),
 * dans l'ordre du chant — les diapos consécutives d'un même groupe sont
 * fusionnées en un seul paragraphe (comme un vrai couplet), et « Introduction »
 * est retirée (redondante avec le titre déjà affiché). Diapos sans parole
 * (vides après nettoyage) omises ; doublons consécutifs stricts fusionnés.
 */
export function extractGroupedLyrics(proBytes: Uint8Array): LyricGroup[] {
  const top = walk(proBytes);
  const slideToGroup = buildSlideToGroup(top);

  const raw: LyricGroup[] = [];
  for (const f of top) {
    if (f.field !== 13 || f.wire !== 2) continue;
    const slide = f.value as Uint8Array;

    const uuidBytes = getAtPath(slide, SLIDE_UUID_PATH);
    const groupe = uuidBytes ? slideToGroup.get(decodeUtf8(uuidBytes).trim()) : undefined;
    if (isIntroduction(groupe)) continue;

    const rtfBytes = getAtPath(slide, SLIDE_RTF_PATH);
    if (!rtfBytes) continue;
    const text = keepLyricLines(rtfToText(latin1(rtfBytes)));
    if (!text) continue;
    // Les sauts de ligne DANS une diapo ne sont qu'un pré-découpage pour un
    // écran étroit (ProPresenter) — pas une structure poétique voulue. On les
    // rejoint en une seule ligne logique par diapo ; le PDF la répartit lui-
    // même sur toute la largeur disponible (pas de retour prématuré).
    const lignes = [text.split('\n').join(' ')];

    const prev = raw[raw.length - 1];
    if (prev && prev.groupe === groupe && prev.lignes.join('\n') === lignes.join('\n')) continue;
    raw.push({ groupe, lignes });
  }
  return mergeConsecutiveGroups(raw);
}

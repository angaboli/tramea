/**
 * Construction d'une TRAME de culte à partir d'un programme importé (scrap
 * Gemini, qui reproduit fidèlement la structure d'origine).
 *
 * Deux étapes indépendantes et PURES (la bibliothèque `.pro` est passée en
 * argument ; aucun accès disque/réseau) :
 *
 *  1. `linkLibraryToProgramme` — lie le `.pro` de chaque chant/moment SANS
 *     toucher à la structure (→ paroles sur le PDF, diapos-titres prêtes).
 *  2. `buildTrameFromProgramme` — dérive la TRAME : on repart du programme
 *     (structure fidèle conservée) et on INSÈRE les moments courants habituels
 *     qui manquent (Annonces, Intercession, Prière à genoux…), à leur place
 *     chronologique, puis on lie les `.pro`. Nouvel id + `kind: 'trame'`.
 */
import type { ItemType, Programme, Section } from '../trame/types';
import { TRAME_CHRONOLOGY } from '../trame/trameTemplate';
import { RECURRING_MOMENTS } from '../trame/recurring';
import {
  findSongByExactName,
  findSongByPrefix,
  matchSongInLibrary,
  normalizeSearch,
  type LibrarySong,
} from '../library/song';

const uid = () => crypto.randomUUID();
const momentByLabel = new Map(RECURRING_MOMENTS.map((m) => [m.label, m]));
// Reconnaissance d'un moment récurrent à partir d'un libellé scrappé, accents et
// casse ignorés (« Prélude », « prelude », « PRÉLUDE » → même moment).
const momentByNorm = new Map(
  RECURRING_MOMENTS.map((m) => [normalizeSearch(m.label), m] as const),
);

/**
 * Lie les fichiers `.pro` À UN PROGRAMME EXISTANT, SANS toucher à sa structure
 * (sections/items/ordre conservés tels quels). Pour chaque item non déjà lié :
 *   - chant → `matchSongInLibrary` (référence de recueil d'abord, sinon titre) ;
 *   - libellé reconnu comme moment récurrent (Prélude, Bénédiction…) → sa
 *     diapo-titre `.pro` si elle existe dans la bibliothèque.
 * Ainsi les paroles s'affichent sur le PDF et les diapos-titres sont prêtes pour
 * l'export ProPresenter. PUR : la bibliothèque est passée en argument.
 */
export function linkLibraryToProgramme(
  programme: Programme,
  songs: readonly LibrarySong[],
): Programme {
  return {
    ...programme, // structure, titre, date ET kind conservés — le caller décide
    sections: programme.sections.map((s) => ({
      ...s,
      items: s.items.map((it) => {
        if (it.proFile) return it;
        if (it.type === 'song') {
          const match = matchSongInLibrary(songs, { titre: it.titre, ref: it.ref });
          return match ? { ...it, proFile: match.name } : it;
        }
        const moment = momentByNorm.get(normalizeSearch(it.titre));
        if (!moment) return it;
        // Diapo-titre exacte (Prélude, Bénédiction…) sinon repli par préfixe
        // (Témoignage, Chant spécial…) pour éviter une diapo vide.
        const found =
          (moment.matchKeys && findSongByExactName(songs, moment.matchKeys)) ||
          findSongByPrefix(songs, moment.matchPrefix);
        return found ? { ...it, proFile: found.name } : it;
      }),
    })),
  };
}

// ── Ordre liturgique de référence (pour l'injection des moments manquants) ────
// Dérivé de la chronologie habituelle : chaque moment connaît sa section
// « d'accueil » et son rang global ; chaque section connaît son rang.
interface Canon {
  norm: string;
  label: string;
  type: ItemType;
  home: string;
  order: number;
}
const MOMENT_CANON: Canon[] = [];
const SECTION_RANK = new Map<string, number>();
{
  let order = 0;
  TRAME_CHRONOLOGY.forEach((tsec, rank) => {
    SECTION_RANK.set(normalizeSearch(tsec.label), rank);
    for (const it of tsec.items) {
      if ('moment' in it) {
        MOMENT_CANON.push({
          norm: normalizeSearch(it.moment),
          label: it.moment,
          type: momentByLabel.get(it.moment)?.type ?? 'label',
          home: tsec.label,
          order: order,
        });
      }
      order++; // les emplacements de chant comptent aussi (positions relatives)
    }
  });
}
const canonOrderOf = (titre: string): number | undefined =>
  MOMENT_CANON.find((c) => c.norm === normalizeSearch(titre))?.order;

/**
 * Insère dans le programme les moments courants habituels ABSENTS (comparaison
 * par libellé, accents/casse ignorés), à leur place chronologique : dans leur
 * section d'accueil (créée au bon rang si nécessaire), avant le premier moment
 * plus tardif déjà présent. PUR — ne lie aucun `.pro` (fait ensuite).
 */
export function injectMissingMoments(programme: Programme): Programme {
  const present = new Set(
    programme.sections.flatMap((s) => s.items.map((it) => normalizeSearch(it.titre))),
  );
  const sections: Section[] = programme.sections.map((s) => ({ ...s, items: [...s.items] }));

  for (const m of MOMENT_CANON) {
    if (present.has(m.norm)) continue;

    // Section d'accueil : réutilisée si présente, sinon créée à son rang.
    let sec = sections.find((s) => normalizeSearch(s.label) === normalizeSearch(m.home));
    if (!sec) {
      sec = { id: uid(), label: m.home, items: [] };
      const rank = SECTION_RANK.get(normalizeSearch(m.home)) ?? Number.MAX_SAFE_INTEGER;
      let at = sections.length;
      for (let i = 0; i < sections.length; i++) {
        const r = SECTION_RANK.get(normalizeSearch(sections[i].label));
        if (r !== undefined && r > rank) {
          at = i;
          break;
        }
      }
      sections.splice(at, 0, sec);
    }

    // Position dans la section : avant le premier moment connu plus tardif.
    let idx = sec.items.length;
    for (let i = 0; i < sec.items.length; i++) {
      const o = canonOrderOf(sec.items[i].titre);
      if (o !== undefined && o > m.order) {
        idx = i;
        break;
      }
    }
    sec.items.splice(idx, 0, { id: uid(), type: m.type, titre: m.label });
    present.add(m.norm);
  }

  return { ...programme, sections };
}

/**
 * Dérive une TRAME prête à l'emploi depuis un programme importé : structure
 * fidèle + moments courants manquants injectés + `.pro` liés. Nouvel id (la
 * trame est un enregistrement distinct du programme) et `kind: 'trame'`.
 */
export function buildTrameFromProgramme(
  programme: Programme,
  songs: readonly LibrarySong[],
): Programme {
  const linked = linkLibraryToProgramme(injectMissingMoments(programme), songs);
  return { ...linked, id: uid(), kind: 'trame' };
}

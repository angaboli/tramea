import type { Programme, Section, TrameItem } from './types';

/** Nombre total de chants (items de type 'song') dans un programme. */
export function countSongs(programme: Programme): number {
  return programme.sections.reduce(
    (n, s) => n + s.items.filter((i) => i.type === 'song').length,
    0,
  );
}

/** Chants qui n'ont pas de fichier .pro associé (à compléter manuellement). */
export function missingProFiles(programme: Programme): TrameItem[] {
  return programme.sections
    .flatMap((s) => s.items)
    .filter((i) => i.type === 'song' && !i.proFile);
}

/**
 * Un programme est exportable en .proPlaylist seulement si chaque chant
 * pointe un fichier .pro. (Le PDF, lui, ne dépend pas du dossier ProPresenter.)
 */
export function isExportableToProplaylist(programme: Programme): boolean {
  return countSongs(programme) > 0 && missingProFiles(programme).length === 0;
}

/** Déplace un item à l'intérieur d'une section (réordonnancement). Immutable. */
export function moveItem(
  section: Section,
  from: number,
  to: number,
): Section {
  if (from === to) return section;
  const items = [...section.items];
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
    return section;
  }
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { ...section, items };
}

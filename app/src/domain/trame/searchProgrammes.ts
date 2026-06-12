import type { Programme } from './types';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filtre des programmes par titre ou date (tokens, tous présents).
 * Conserve l'ordre d'entrée (les plus récents d'abord côté appelant).
 */
export function searchProgrammes(
  programmes: readonly Programme[],
  query: string,
): Programme[] {
  const q = normalize(query);
  if (!q) return [...programmes];
  const tokens = q.split(' ');
  return programmes.filter((p) => {
    const hay = normalize(`${p.titre} ${p.date}`);
    return tokens.every((t) => hay.includes(t));
  });
}

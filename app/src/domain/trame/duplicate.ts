import type { Programme } from './types';

const uid = () => crypto.randomUUID();

/**
 * Duplique un programme : copie profonde avec de NOUVEAUX identifiants
 * (programme, sections, items). Le titre est conservé ; la date peut être
 * réinitialisée (par défaut, on garde celle d'origine). Immutable.
 */
export function duplicateProgramme(p: Programme, date?: string): Programme {
  return {
    id: uid(),
    titre: p.titre,
    date: date ?? p.date,
    sections: p.sections.map((s) => ({
      id: uid(),
      label: s.label,
      items: s.items.map((i) => ({ ...i, id: uid() })),
    })),
  };
}

/**
 * Opérations d'édition d'un Programme — PURES et IMMUTABLES.
 * Chaque fonction renvoie un nouveau Programme sans muter l'entrée.
 */
import type { Programme, Section, TrameItem, ItemType } from './types';

function uid(): string {
  return crypto.randomUUID();
}

export function emptyProgramme(date: string, titre = ''): Programme {
  return { id: uid(), date, titre, sections: [] };
}

function move<T>(arr: readonly T[], from: number, to: number): T[] {
  const copy = [...arr];
  if (from < 0 || from >= copy.length || to < 0 || to >= copy.length) return copy;
  const [m] = copy.splice(from, 1);
  copy.splice(to, 0, m);
  return copy;
}

function mapSection(
  p: Programme,
  sectionId: string,
  fn: (s: Section) => Section,
): Programme {
  return { ...p, sections: p.sections.map((s) => (s.id === sectionId ? fn(s) : s)) };
}

// ── Sections ────────────────────────────────────────────────────────────────

export function addSection(p: Programme, label: string): Programme {
  const section: Section = { id: uid(), label, items: [] };
  return { ...p, sections: [...p.sections, section] };
}

export function renameSection(p: Programme, sectionId: string, label: string): Programme {
  return mapSection(p, sectionId, (s) => ({ ...s, label }));
}

export function removeSection(p: Programme, sectionId: string): Programme {
  return { ...p, sections: p.sections.filter((s) => s.id !== sectionId) };
}

export function moveSection(p: Programme, from: number, to: number): Programme {
  return { ...p, sections: move(p.sections, from, to) };
}

// ── Items ───────────────────────────────────────────────────────────────────

export function addItem(
  p: Programme,
  sectionId: string,
  type: ItemType,
  titre = '',
): Programme {
  const item: TrameItem = { id: uid(), type, titre };
  return mapSection(p, sectionId, (s) => ({ ...s, items: [...s.items, item] }));
}

export function updateItem(
  p: Programme,
  sectionId: string,
  itemId: string,
  patch: Partial<Omit<TrameItem, 'id'>>,
): Programme {
  return mapSection(p, sectionId, (s) => ({
    ...s,
    items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  }));
}

export function removeItem(p: Programme, sectionId: string, itemId: string): Programme {
  return mapSection(p, sectionId, (s) => ({
    ...s,
    items: s.items.filter((i) => i.id !== itemId),
  }));
}

export function moveItem(
  p: Programme,
  sectionId: string,
  from: number,
  to: number,
): Programme {
  return mapSection(p, sectionId, (s) => ({ ...s, items: move(s.items, from, to) }));
}

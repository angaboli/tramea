import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ItemType, Programme, TrameItem } from '../../domain/trame/types';
import * as edit from '../../domain/trame/edit';
import { nextSaturday } from '../../domain/trame/formatDate';

interface EditorState {
  programme: Programme;
  reset: (date?: string, titre?: string, kind?: Programme['kind']) => void;
  load: (p: Programme) => void;
  setMeta: (patch: Partial<Pick<Programme, 'titre' | 'date' | 'titleColor'>>) => void;
  addSection: (label: string) => void;
  renameSection: (id: string, label: string) => void;
  setSectionColor: (id: string, color: string | undefined) => void;
  removeSection: (id: string) => void;
  moveSection: (from: number, to: number) => void;
  addItem: (
    sectionId: string,
    type: ItemType,
    titre?: string,
    patch?: Partial<Omit<TrameItem, 'id' | 'type' | 'titre'>>,
  ) => void;
  updateItem: (sectionId: string, itemId: string, patch: Partial<Omit<TrameItem, 'id'>>) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  moveItem: (sectionId: string, from: number, to: number) => void;
  moveItemToSection: (fromSectionId: string, itemId: string, toSectionId: string) => void;
}

export const useProgrammeEditor = create<EditorState>()(
  persist(
    (set) => ({
      programme: edit.emptyProgramme(nextSaturday(), 'Sabbat'),

      // Nouveau programme/trame : "Sabbat" le prochain samedi par défaut —
      // le cas d'usage réel quasi systématique, à ajuster au besoin.
      reset: (date = nextSaturday(), titre = 'Sabbat', kind: Programme['kind'] = 'programme') =>
        set({ programme: edit.emptyProgramme(date, titre, kind) }),
      load: (p) => set({ programme: p }),
      setMeta: (patch) => set((s) => ({ programme: { ...s.programme, ...patch } })),

      addSection: (label) => set((s) => ({ programme: edit.addSection(s.programme, label) })),
      renameSection: (id, label) =>
        set((s) => ({ programme: edit.renameSection(s.programme, id, label) })),
      setSectionColor: (id, color) =>
        set((s) => ({ programme: edit.setSectionColor(s.programme, id, color) })),
      removeSection: (id) => set((s) => ({ programme: edit.removeSection(s.programme, id) })),
      moveSection: (from, to) =>
        set((s) => ({ programme: edit.moveSection(s.programme, from, to) })),

      addItem: (sectionId, type, titre, patch) =>
        set((s) => ({ programme: edit.addItem(s.programme, sectionId, type, titre, patch) })),
      updateItem: (sectionId, itemId, patch) =>
        set((s) => ({ programme: edit.updateItem(s.programme, sectionId, itemId, patch) })),
      removeItem: (sectionId, itemId) =>
        set((s) => ({ programme: edit.removeItem(s.programme, sectionId, itemId) })),
      moveItem: (sectionId, from, to) =>
        set((s) => ({ programme: edit.moveItem(s.programme, sectionId, from, to) })),
      moveItemToSection: (fromSectionId, itemId, toSectionId) =>
        set((s) => ({
          programme: edit.moveItemToSection(s.programme, fromSectionId, itemId, toSectionId),
        })),
    }),
    {
      name: 'tramea.editor',
      storage: createJSONStorage(() => localStorage),
      // On ne persiste que le programme en cours (pas les actions).
      partialize: (s) => ({ programme: s.programme }),
    },
  ),
);

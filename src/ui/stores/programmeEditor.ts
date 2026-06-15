import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ItemType, Programme, TrameItem } from '../../domain/trame/types';
import * as edit from '../../domain/trame/edit';

interface EditorState {
  programme: Programme;
  reset: (date?: string, titre?: string, kind?: Programme['kind']) => void;
  load: (p: Programme) => void;
  setMeta: (patch: Partial<Pick<Programme, 'titre' | 'date'>>) => void;
  addSection: (label: string) => void;
  renameSection: (id: string, label: string) => void;
  setSectionColor: (id: string, color: string | undefined) => void;
  removeSection: (id: string) => void;
  moveSection: (from: number, to: number) => void;
  addItem: (sectionId: string, type: ItemType, titre?: string) => void;
  updateItem: (sectionId: string, itemId: string, patch: Partial<Omit<TrameItem, 'id'>>) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  moveItem: (sectionId: string, from: number, to: number) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useProgrammeEditor = create<EditorState>()(
  persist(
    (set) => ({
      programme: edit.emptyProgramme(today()),

      reset: (date = today(), titre = '', kind: Programme['kind'] = 'programme') =>
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

      addItem: (sectionId, type, titre) =>
        set((s) => ({ programme: edit.addItem(s.programme, sectionId, type, titre) })),
      updateItem: (sectionId, itemId, patch) =>
        set((s) => ({ programme: edit.updateItem(s.programme, sectionId, itemId, patch) })),
      removeItem: (sectionId, itemId) =>
        set((s) => ({ programme: edit.removeItem(s.programme, sectionId, itemId) })),
      moveItem: (sectionId, from, to) =>
        set((s) => ({ programme: edit.moveItem(s.programme, sectionId, from, to) })),
    }),
    {
      name: 'tramea.editor',
      storage: createJSONStorage(() => localStorage),
      // On ne persiste que le programme en cours (pas les actions).
      partialize: (s) => ({ programme: s.programme }),
    },
  ),
);

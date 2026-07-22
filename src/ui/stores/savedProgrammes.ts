import { create } from 'zustand';
import type { SavedProgramme } from '../../domain/ports/ProgrammeRepositoryPort';
import type { Programme } from '../../domain/trame/types';
import { programmeRepository } from '../../infrastructure/persistence/programmeRepository';

interface SavedState {
  items: SavedProgramme[];
  loading: boolean;
  refresh: () => Promise<void>;
  save: (p: Programme) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSavedProgrammes = create<SavedState>((set) => ({
  items: [],
  loading: false,
  async refresh() {
    set({ loading: true });
    const items = await programmeRepository.list();
    set({ items, loading: false });
  },
  /**
   * Persiste IMMÉDIATEMENT un programme/trame puis rafraîchit la liste —
   * utilisé à la création (import, nouvelle trame) pour ne pas dépendre du
   * délai de l'autosave : le document est visible en base et dans la liste
   * dès qu'on quitte l'écran de création.
   */
  async save(p) {
    await programmeRepository.save(p);
    const items = await programmeRepository.list();
    set({ items });
  },
  async remove(id) {
    await programmeRepository.remove(id);
    const items = await programmeRepository.list();
    set({ items });
  },
}));

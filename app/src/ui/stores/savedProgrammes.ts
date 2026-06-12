import { create } from 'zustand';
import type { SavedProgramme } from '../../domain/ports/ProgrammeRepositoryPort';
import { programmeRepository } from '../../infrastructure/persistence/idbProgrammeRepository';

interface SavedState {
  items: SavedProgramme[];
  loading: boolean;
  refresh: () => Promise<void>;
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
  async remove(id) {
    await programmeRepository.remove(id);
    const items = await programmeRepository.list();
    set({ items });
  },
}));

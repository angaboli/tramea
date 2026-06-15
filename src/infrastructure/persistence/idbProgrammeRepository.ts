/**
 * Persistance des programmes dans IndexedDB (idb-keyval).
 * Implémente ProgrammeRepositoryPort. Les données restent 100% locales.
 */
import { createStore, set, get, del, values, type UseStore } from 'idb-keyval';
import type { Programme } from '../../domain/trame/types';
import type {
  ProgrammeRepositoryPort,
  SavedProgramme,
} from '../../domain/ports/ProgrammeRepositoryPort';

export class IdbProgrammeRepository implements ProgrammeRepositoryPort {
  private store: UseStore;

  constructor(dbName = 'tramea', storeName = 'programmes') {
    this.store = createStore(dbName, storeName);
  }

  async save(programme: Programme): Promise<void> {
    const record: SavedProgramme = { programme, updatedAt: Date.now() };
    await set(programme.id, record, this.store);
  }

  async list(): Promise<SavedProgramme[]> {
    const all = (await values(this.store)) as SavedProgramme[];
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<Programme | null> {
    const record = (await get(id, this.store)) as SavedProgramme | undefined;
    return record?.programme ?? null;
  }

  async remove(id: string): Promise<void> {
    await del(id, this.store);
  }
}

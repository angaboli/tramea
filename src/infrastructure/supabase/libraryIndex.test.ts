import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = {
  deleted: false,
  inserted: [] as unknown[],
  rows: [] as { name: string; rel_path: string }[],
};

vi.mock('./client', () => ({
  get supabase() {
    return {
      from: () => ({
        delete: () => ({
          not: () => {
            state.deleted = true;
            return Promise.resolve({ error: null });
          },
        }),
        insert: (rows: unknown[]) => {
          state.inserted = rows;
          return Promise.resolve({ error: null });
        },
        select: () => Promise.resolve({ data: state.rows, error: null }),
      }),
    };
  },
}));

const { publishLibraryIndex, fetchLibraryIndex } = await import('./libraryIndex');

describe('libraryIndex', () => {
  beforeEach(() => {
    state.deleted = false;
    state.inserted = [];
    state.rows = [];
  });

  it('publishLibraryIndex remplace tout (delete puis insert)', async () => {
    await publishLibraryIndex([{ name: 'Agnus Dei.pro', relPath: 'Libraries/Agnus Dei.pro' }]);
    expect(state.deleted).toBe(true);
    expect(state.inserted).toEqual([{ name: 'Agnus Dei.pro', rel_path: 'Libraries/Agnus Dei.pro' }]);
  });

  it('publishLibraryIndex sur liste vide : vide juste (pas d’insert)', async () => {
    await publishLibraryIndex([]);
    expect(state.deleted).toBe(true);
    expect(state.inserted).toEqual([]);
  });

  it('fetchLibraryIndex mappe rel_path -> relPath', async () => {
    state.rows = [{ name: 'Agnus Dei.pro', rel_path: 'Libraries/Agnus Dei.pro' }];
    const songs = await fetchLibraryIndex();
    expect(songs).toEqual([{ name: 'Agnus Dei.pro', relPath: 'Libraries/Agnus Dei.pro' }]);
  });
});

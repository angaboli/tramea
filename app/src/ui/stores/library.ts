import { create } from 'zustand';
import type { LibrarySong } from '../../domain/library/song';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';

interface LibraryState {
  /** Adapter prêt (dossier choisi) ou null (mode dégradé). */
  adapter: FileSystemPort | null;
  songs: LibrarySong[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** Ouvre le sélecteur de dossier ProPresenter et indexe les chants. */
  connect: () => Promise<void>;
}

export const supportsFolder = FileSystemAccessAdapter.isSupported();

export const useLibrary = create<LibraryState>((set) => ({
  adapter: null,
  songs: [],
  ready: false,
  busy: false,
  error: null,

  async connect() {
    set({ busy: true, error: null });
    try {
      const adapter = new FileSystemAccessAdapter();
      await adapter.pickDirectory();
      const songs: LibrarySong[] = adapter
        .listPresentations()
        .map((p) => ({ name: p.name, relPath: p.relPath }));
      set({ adapter, songs, ready: true, busy: false });
    } catch (e) {
      set({
        busy: false,
        error: e instanceof Error ? e.message : 'Sélection annulée',
      });
    }
  },
}));

import { create } from 'zustand';
import type { LibrarySong } from '../../domain/library/song';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';
import { DirectoryInputAdapter } from '../../infrastructure/fs/directoryInputAdapter';

interface LibraryState {
  /** Adapter prêt (dossier choisi) ou null (mode dégradé). */
  adapter: FileSystemPort | null;
  songs: LibrarySong[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** Sélection de dossier via File System Access API (Chrome/Edge). */
  connect: () => Promise<void>;
  /** Indexation depuis des fichiers (<input webkitdirectory>) — universel. */
  connectFiles: (files: File[]) => void;
}

// Sélection de dossier disponible partout via <input webkitdirectory>
// (Brave/Chrome/Edge/Firefox), au-delà de la File System Access API.
export const supportsFolder = true;

function indexAndSet(
  set: (p: Partial<LibraryState>) => void,
  adapter: FileSystemPort,
) {
  const songs: LibrarySong[] = adapter
    .listPresentations()
    .map((p) => ({ name: p.name, relPath: p.relPath }));
  set({
    adapter,
    songs,
    ready: songs.length > 0,
    busy: false,
    error: songs.length > 0 ? null : 'Aucun fichier .pro trouvé dans ce dossier.',
  });
}

export const useLibrary = create<LibraryState>((set) => ({
  adapter: null,
  songs: [],
  ready: false,
  busy: false,
  error: null,

  async connect() {
    if (!FileSystemAccessAdapter.isSupported()) {
      set({ error: 'Utilisez le bouton de sélection de dossier.' });
      return;
    }
    set({ busy: true, error: null });
    try {
      const adapter = new FileSystemAccessAdapter();
      await adapter.pickDirectory();
      indexAndSet(set, adapter);
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'Sélection annulée' });
    }
  },

  connectFiles(files: File[]) {
    indexAndSet(set, new DirectoryInputAdapter(files));
  },
}));

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
  /** Réutilise silencieusement le dossier mémorisé si l'accès est déjà accordé. */
  restore: () => Promise<void>;
  /** Connexion par geste : réutilise le dossier mémorisé (ré-autorisation) ou ouvre le sélecteur. */
  connect: () => Promise<void>;
  /** Indexation depuis des fichiers (<input webkitdirectory>) — Brave / Firefox. */
  connectFiles: (files: File[]) => void;
}

// Sélection de dossier disponible partout via <input webkitdirectory>.
export const supportsFolder = true;
// File System Access API (Chrome/Edge) : permet de MÉMORISER le dossier.
export const supportsPersistentFolder = FileSystemAccessAdapter.isSupported();

function indexAndSet(set: (p: Partial<LibraryState>) => void, adapter: FileSystemPort) {
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

export const useLibrary = create<LibraryState>((set, getState) => ({
  adapter: null,
  songs: [],
  ready: false,
  busy: false,
  error: null,

  async restore() {
    if (getState().ready) return;
    try {
      const adapter = await FileSystemAccessAdapter.restoreSilent();
      if (adapter) indexAndSet(set, adapter);
    } catch {
      /* silencieux : on demandera la connexion au besoin */
    }
  },

  async connect() {
    if (!FileSystemAccessAdapter.isSupported()) {
      set({ error: 'Utilisez le bouton de sélection de dossier.' });
      return;
    }
    set({ busy: true, error: null });
    try {
      indexAndSet(set, await FileSystemAccessAdapter.connect());
    } catch (e) {
      set({ busy: false, error: e instanceof Error ? e.message : 'Sélection annulée' });
    }
  },

  connectFiles(files: File[]) {
    indexAndSet(set, new DirectoryInputAdapter(files));
  },
}));

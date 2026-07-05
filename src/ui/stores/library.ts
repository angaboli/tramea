import { create } from 'zustand';
import type { LibrarySong } from '../../domain/library/song';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';
import { DirectoryInputAdapter } from '../../infrastructure/fs/directoryInputAdapter';
import { R2Adapter } from '../../infrastructure/fs/r2Adapter';

type Source = 'local' | 'r2' | null;

interface LibraryState {
  /** Adapter prêt (dossier local OU bibliothèque R2 en ligne). */
  adapter: FileSystemPort | null;
  songs: LibrarySong[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** D'où viennent les chants affichés : dossier local, ou bibliothèque R2 (permanente, en ligne). */
  source: Source;
  /**
   * Réutilise silencieusement le dossier local mémorisé si l'accès est déjà
   * accordé ; sinon, se connecte à la bibliothèque R2 (permanente, en ligne,
   * pas besoin de dossier local pour l'utiliser — recherche ET export
   * .proPlaylist fonctionnent).
   */
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

function indexAndSet(
  set: (p: Partial<LibraryState>) => void,
  adapter: FileSystemPort,
  source: Source = 'local',
) {
  const songs: LibrarySong[] = adapter
    .listPresentations()
    .map((p) => ({ name: p.name, relPath: p.relPath }));
  set({
    adapter,
    songs,
    source,
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
  source: null,

  async restore() {
    if (getState().ready) return;
    try {
      const adapter = await FileSystemAccessAdapter.restoreSilent();
      if (adapter) {
        indexAndSet(set, adapter);
        return;
      }
    } catch {
      /* silencieux : on retombe sur la bibliothèque R2 */
    }
    try {
      const r2 = await R2Adapter.connect();
      if (r2) indexAndSet(set, r2, 'r2');
    } catch {
      /* silencieux : reste en mode dégradé (aucune bibliothèque) */
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

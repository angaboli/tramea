import { create } from 'zustand';
import type { LibrarySong } from '../../domain/library/song';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';
import { DirectoryInputAdapter } from '../../infrastructure/fs/directoryInputAdapter';
import { publishLibraryIndex, fetchLibraryIndex } from '../../infrastructure/supabase/libraryIndex';
import { isSupabaseConfigured } from '../../infrastructure/supabase/client';

type Source = 'local' | 'shared' | null;

interface LibraryState {
  /** Adapter prêt (dossier LOCAL choisi) ou null (mode partagé/dégradé). */
  adapter: FileSystemPort | null;
  songs: LibrarySong[];
  ready: boolean;
  busy: boolean;
  error: string | null;
  /** D'où viennent les chants affichés : dossier local, ou index partagé (Supabase). */
  source: Source;
  publishing: boolean;
  publishError: string | null;
  /**
   * Réutilise silencieusement le dossier local mémorisé si l'accès est déjà
   * accordé ; sinon, replie sur l'index PARTAGÉ (noms de fichiers .pro publiés
   * par quiconque a le dossier connecté) — pas besoin de reconnecter à chaque
   * fois pour simplement chercher/lier un chant.
   */
  restore: () => Promise<void>;
  /** Connexion par geste : réutilise le dossier mémorisé (ré-autorisation) ou ouvre le sélecteur. */
  connect: () => Promise<void>;
  /** Indexation depuis des fichiers (<input webkitdirectory>) — Brave / Firefox. */
  connectFiles: (files: File[]) => void;
  /** Publie la liste de noms (dossier LOCAL connecté) vers l'index partagé. */
  publish: () => Promise<void>;
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
    source: 'local',
    ready: songs.length > 0,
    busy: false,
    error: songs.length > 0 ? null : 'Aucun fichier .pro trouvé dans ce dossier.',
  });
}

async function fallbackToShared(set: (p: Partial<LibraryState>) => void) {
  if (!isSupabaseConfigured) return;
  try {
    const songs = await fetchLibraryIndex();
    if (songs.length > 0) set({ songs, source: 'shared', ready: true });
  } catch {
    /* silencieux : reste en mode dégradé (aucune bibliothèque) */
  }
}

export const useLibrary = create<LibraryState>((set, getState) => ({
  adapter: null,
  songs: [],
  ready: false,
  busy: false,
  error: null,
  source: null,
  publishing: false,
  publishError: null,

  async restore() {
    if (getState().ready) return;
    try {
      const adapter = await FileSystemAccessAdapter.restoreSilent();
      if (adapter) {
        indexAndSet(set, adapter);
        return;
      }
    } catch {
      /* silencieux : on retombe sur l'index partagé */
    }
    await fallbackToShared(set);
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

  async publish() {
    const { songs, source } = getState();
    if (source !== 'local' || songs.length === 0) return;
    set({ publishing: true, publishError: null });
    try {
      await publishLibraryIndex(songs);
      set({ publishing: false });
    } catch (e) {
      set({ publishing: false, publishError: e instanceof Error ? e.message : 'Erreur inconnue.' });
    }
  },
}));

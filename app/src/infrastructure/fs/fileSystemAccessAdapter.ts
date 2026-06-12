/**
 * Adapter File System Access API → FileSystemPort (navigateur Chromium).
 * Lit le dossier ProPresenter choisi par l'utilisateur : index des `.pro`
 * (sous Libraries/) et des médias (sous Media/). Aucun fichier ne quitte le poste.
 *
 * Non testé unitairement (API navigateur) ; la logique métier est couverte via
 * l'adapter mémoire dans les tests du cas d'usage.
 */
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type {
  FileSystemPort,
  ProResource,
  PresentationRef,
} from '../../domain/ports/FileSystemPort';

// Clé de persistance du handle de dossier (IndexedDB stocke les FileSystemHandle).
const HANDLE_KEY = 'tramea.dirHandle';

type Perm = 'granted' | 'denied' | 'prompt';

// Déclarations minimales (selon le support TS DOM).
type DirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterableIterator<FileSystemHandle>;
  queryPermission?: (o?: { mode?: 'read' | 'readwrite' }) => Promise<Perm>;
  requestPermission?: (o?: { mode?: 'read' | 'readwrite' }) => Promise<Perm>;
};

interface PickerWindow {
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<DirHandle>;
}

export class FileSystemAccessAdapter implements FileSystemPort {
  private root: DirHandle | null = null;
  /** basename .pro → { handle, relPath } */
  private presentations = new Map<string, { handle: FileSystemFileHandle; relPath: string }>();
  /** basename média → handle */
  private mediaIndex = new Map<string, FileSystemFileHandle>();

  static isSupported(): boolean {
    return typeof (window as PickerWindow).showDirectoryPicker === 'function';
  }

  /**
   * Restauration SILENCIEUSE : réutilise le dossier mémorisé si la permission
   * est déjà accordée (aucune fenêtre). Renvoie null sinon (sans rien demander).
   */
  static async restoreSilent(): Promise<FileSystemAccessAdapter | null> {
    if (!FileSystemAccessAdapter.isSupported()) return null;
    const handle = (await idbGet(HANDLE_KEY)) as DirHandle | undefined;
    if (!handle) return null;
    const perm = (await handle.queryPermission?.({ mode: 'read' })) ?? 'prompt';
    if (perm !== 'granted') return null;
    const adapter = new FileSystemAccessAdapter();
    adapter.root = handle;
    await adapter.reindex();
    return adapter;
  }

  /**
   * Connexion par geste utilisateur : réutilise le dossier mémorisé en
   * (re)demandant l'autorisation ; n'ouvre le sélecteur que s'il n'y a pas de
   * dossier mémorisé ou si l'autorisation est refusée.
   */
  static async connect(): Promise<FileSystemAccessAdapter> {
    const win = window as PickerWindow;
    if (!win.showDirectoryPicker) {
      throw new Error('File System Access API non supportée par ce navigateur.');
    }
    const saved = (await idbGet(HANDLE_KEY)) as DirHandle | undefined;
    const adapter = new FileSystemAccessAdapter();

    if (saved) {
      let perm = (await saved.queryPermission?.({ mode: 'read' })) ?? 'prompt';
      if (perm !== 'granted') {
        perm = (await saved.requestPermission?.({ mode: 'read' })) ?? 'denied';
      }
      if (perm === 'granted') {
        adapter.root = saved;
        await adapter.reindex();
        return adapter;
      }
      await idbDel(HANDLE_KEY); // handle invalide → on repart sur un choix
    }

    adapter.root = await win.showDirectoryPicker({ mode: 'read' });
    await idbSet(HANDLE_KEY, adapter.root);
    await adapter.reindex();
    return adapter;
  }

  isAvailable(): boolean {
    return this.root !== null;
  }

  listPresentations(): PresentationRef[] {
    return [...this.presentations.entries()].map(([name, v]) => ({
      name,
      relPath: v.relPath,
    }));
  }

  /** Ouvre le sélecteur de dossier et construit les index. */
  async pickDirectory(): Promise<void> {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) throw new Error('File System Access API non supportée par ce navigateur.');
    this.root = await picker({ mode: 'read' });
    await idbSet(HANDLE_KEY, this.root);
    await this.reindex();
  }

  private async reindex(): Promise<void> {
    this.presentations.clear();
    this.mediaIndex.clear();
    if (!this.root) return;
    await this.walkDir(this.root, '');
  }

  private async walkDir(dir: DirHandle, prefix: string): Promise<void> {
    for await (const entry of dir.values()) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') {
        await this.walkDir(entry as DirHandle, path);
      } else if (entry.kind === 'file') {
        const fh = entry as FileSystemFileHandle;
        if (entry.name.toLowerCase().endsWith('.pro')) {
          if (!this.presentations.has(entry.name)) {
            this.presentations.set(entry.name, { handle: fh, relPath: path });
          }
        } else if (path.startsWith('Media/') || path.includes('/Media/')) {
          if (!this.mediaIndex.has(entry.name)) this.mediaIndex.set(entry.name, fh);
        }
      }
    }
  }

  async resolvePresentation(fileName: string): Promise<ProResource | null> {
    const found = this.presentations.get(fileName);
    if (!found) return null;
    const file = await found.handle.getFile();
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { relPath: found.relPath, absPath: found.relPath, bytes };
  }

  async resolveMedia(basename: string): Promise<Uint8Array | null> {
    const handle = this.mediaIndex.get(basename);
    if (!handle) return null;
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }
}

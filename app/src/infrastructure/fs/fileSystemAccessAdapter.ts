/**
 * Adapter File System Access API → FileSystemPort (navigateur Chromium).
 * Lit le dossier ProPresenter choisi par l'utilisateur : index des `.pro`
 * (sous Libraries/) et des médias (sous Media/). Aucun fichier ne quitte le poste.
 *
 * Non testé unitairement (API navigateur) ; la logique métier est couverte via
 * l'adapter mémoire dans les tests du cas d'usage.
 */
import type { FileSystemPort, ProResource } from '../../domain/ports/FileSystemPort';

// Déclarations minimales (selon le support TS DOM).
type DirHandle = FileSystemDirectoryHandle & {
  values(): AsyncIterableIterator<FileSystemHandle>;
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

  isAvailable(): boolean {
    return this.root !== null;
  }

  /** Ouvre le sélecteur de dossier et construit les index. */
  async pickDirectory(): Promise<void> {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) throw new Error('File System Access API non supportée par ce navigateur.');
    this.root = await picker({ mode: 'read' });
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

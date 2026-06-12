/**
 * Adapter de dossier basé sur <input type="file" webkitdirectory>.
 * Universel (Brave, Chrome, Edge, Firefox) — contrairement à la File System
 * Access API (showDirectoryPicker), désactivée dans Brave. Implémente FileSystemPort.
 */
import type {
  FileSystemPort,
  ProResource,
  PresentationRef,
} from '../../domain/ports/FileSystemPort';

/** Retire le 1er segment (nom du dossier racine choisi) du webkitRelativePath. */
export function stripRoot(relPath: string): string {
  const parts = relPath.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : relPath;
}

/** Le chemin pointe-t-il vers un média (dossier Media/) ? */
export function isMediaPath(relPath: string): boolean {
  return /(^|\/)Media\//i.test(relPath);
}

interface WithRelPath extends File {
  webkitRelativePath: string;
}

export class DirectoryInputAdapter implements FileSystemPort {
  private presentations = new Map<string, { file: File; relPath: string }>();
  private media = new Map<string, File>();

  constructor(files: File[]) {
    for (const f of files) {
      const rel = stripRoot((f as WithRelPath).webkitRelativePath || f.name);
      if (f.name.toLowerCase().endsWith('.pro')) {
        if (!this.presentations.has(f.name)) {
          this.presentations.set(f.name, { file: f, relPath: rel });
        }
      } else if (isMediaPath(rel)) {
        if (!this.media.has(f.name)) this.media.set(f.name, f);
      }
    }
  }

  isAvailable(): boolean {
    return this.presentations.size > 0;
  }

  listPresentations(): PresentationRef[] {
    return [...this.presentations.entries()].map(([name, v]) => ({
      name,
      relPath: v.relPath,
    }));
  }

  async resolvePresentation(fileName: string): Promise<ProResource | null> {
    const v = this.presentations.get(fileName);
    if (!v) return null;
    return {
      relPath: v.relPath,
      absPath: v.relPath,
      bytes: new Uint8Array(await v.file.arrayBuffer()),
    };
  }

  async resolveMedia(basename: string): Promise<Uint8Array | null> {
    const f = this.media.get(basename);
    if (!f) return null;
    return new Uint8Array(await f.arrayBuffer());
  }
}

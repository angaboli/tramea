/**
 * Adapter bibliothèque partagée (Cloudflare R2, bucket PRIVÉ) → FileSystemPort.
 * Miroir distant de FileSystemAccessAdapter : mêmes conventions (.pro à la
 * racine ou sous Libraries/, médias sous Media/), mais lu via les fonctions
 * serveur /api/r2-list et /api/r2-file (les identifiants R2 restent côté
 * serveur, jamais dans le navigateur). Permet d'utiliser la bibliothèque
 * (recherche ET export .proPlaylist) sans dossier local connecté.
 */
import type {
  FileSystemPort,
  ProResource,
  PresentationRef,
} from '../../domain/ports/FileSystemPort';

export class R2Adapter implements FileSystemPort {
  private presentations = new Map<string, string>(); // basename .pro → clé R2
  private mediaIndex = new Map<string, string>(); // basename média → clé R2

  private constructor() {}

  /** Charge la liste des clés depuis /api/r2-list. null si R2 non configuré/indisponible. */
  static async connect(): Promise<R2Adapter | null> {
    let res: Response;
    try {
      res = await fetch('/api/r2-list');
    } catch {
      return null;
    }
    if (!res.ok) return null;

    const { keys } = (await res.json()) as { keys: string[] };
    const adapter = new R2Adapter();
    for (const key of keys) {
      const basename = key.split('/').pop() ?? key;
      if (basename.toLowerCase().endsWith('.pro')) {
        if (!adapter.presentations.has(basename)) adapter.presentations.set(basename, key);
      } else if (key.startsWith('Media/') || key.includes('/Media/')) {
        if (!adapter.mediaIndex.has(basename)) adapter.mediaIndex.set(basename, key);
      }
    }
    return adapter.presentations.size > 0 ? adapter : null;
  }

  isAvailable(): boolean {
    return this.presentations.size > 0;
  }

  listPresentations(): PresentationRef[] {
    return [...this.presentations.entries()].map(([name, key]) => ({ name, relPath: key }));
  }

  async resolvePresentation(fileName: string): Promise<ProResource | null> {
    const key = this.presentations.get(fileName);
    if (!key) return null;
    const bytes = await fetchBytes(key);
    return bytes ? { relPath: key, absPath: key, bytes } : null;
  }

  async resolveMedia(basename: string): Promise<Uint8Array | null> {
    const key = this.mediaIndex.get(basename);
    if (!key) return null;
    return fetchBytes(key);
  }
}

async function fetchBytes(key: string): Promise<Uint8Array | null> {
  const res = await fetch(`/api/r2-file?key=${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

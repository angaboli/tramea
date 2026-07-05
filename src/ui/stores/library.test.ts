import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';

vi.mock('../../infrastructure/fs/fileSystemAccessAdapter', () => ({
  FileSystemAccessAdapter: {
    isSupported: () => true,
    restoreSilent: vi.fn().mockResolvedValue(null), // rien en local
    connect: vi.fn(),
  },
}));
vi.mock('../../infrastructure/supabase/client', () => ({ isSupabaseConfigured: true }));
vi.mock('../../infrastructure/supabase/libraryIndex', () => ({
  fetchLibraryIndex: vi.fn().mockResolvedValue([
    { name: 'Bienvenue.pro', relPath: 'Libraries/Bienvenue.pro' },
  ]),
  publishLibraryIndex: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../infrastructure/fs/r2Adapter', () => ({
  R2Adapter: { connect: vi.fn().mockResolvedValue(null) }, // R2 non configuré par défaut
}));

const { useLibrary } = await import('./library');
const { R2Adapter } = await import('../../infrastructure/fs/r2Adapter');

describe('useLibrary — repli sur l’index partagé', () => {
  beforeEach(() => {
    useLibrary.setState({
      adapter: null,
      songs: [],
      ready: false,
      busy: false,
      error: null,
      source: null,
      publishing: false,
      publishError: null,
    });
  });

  it('restore() : sans dossier local ni R2, retombe sur l’index partagé (noms seulement)', async () => {
    await useLibrary.getState().restore();
    const s = useLibrary.getState();
    expect(s.source).toBe('shared');
    expect(s.ready).toBe(true);
    expect(s.adapter).toBeNull(); // pas de fichiers réels en mode partagé
    expect(s.songs).toEqual([{ name: 'Bienvenue.pro', relPath: 'Libraries/Bienvenue.pro' }]);
  });

  it('restore() : R2 disponible est préféré à l’index Supabase (adapter complet, export possible)', async () => {
    const r2Adapter: FileSystemPort = {
      isAvailable: () => true,
      listPresentations: () => [{ name: 'Agnus.pro', relPath: 'Libraries/JEM/Agnus.pro' }],
      resolvePresentation: vi.fn(),
      resolveMedia: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(R2Adapter.connect).mockResolvedValueOnce(r2Adapter as any);

    await useLibrary.getState().restore();
    const s = useLibrary.getState();
    expect(s.source).toBe('r2');
    expect(s.ready).toBe(true);
    expect(s.adapter).toBe(r2Adapter); // export .proPlaylist possible via R2
    expect(s.songs).toEqual([{ name: 'Agnus.pro', relPath: 'Libraries/JEM/Agnus.pro' }]);
  });

  it('publish() : ignoré si pas en mode local (rien à publier)', async () => {
    useLibrary.setState({ source: 'shared', songs: [{ name: 'x.pro', relPath: 'x' }] });
    const { publishLibraryIndex } = await import('../../infrastructure/supabase/libraryIndex');
    await useLibrary.getState().publish();
    expect(publishLibraryIndex).not.toHaveBeenCalled();
  });
});

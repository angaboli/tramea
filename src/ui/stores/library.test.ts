import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { useLibrary } = await import('./library');

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

  it('restore() : sans dossier local, retombe sur l’index partagé', async () => {
    await useLibrary.getState().restore();
    const s = useLibrary.getState();
    expect(s.source).toBe('shared');
    expect(s.ready).toBe(true);
    expect(s.adapter).toBeNull(); // pas de fichiers réels en mode partagé
    expect(s.songs).toEqual([{ name: 'Bienvenue.pro', relPath: 'Libraries/Bienvenue.pro' }]);
  });

  it('publish() : ignoré si pas en mode local (rien à publier)', async () => {
    useLibrary.setState({ source: 'shared', songs: [{ name: 'x.pro', relPath: 'x' }] });
    const { publishLibraryIndex } = await import('../../infrastructure/supabase/libraryIndex');
    await useLibrary.getState().publish();
    expect(publishLibraryIndex).not.toHaveBeenCalled();
  });
});

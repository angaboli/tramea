import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';

vi.mock('../../infrastructure/fs/fileSystemAccessAdapter', () => ({
  FileSystemAccessAdapter: {
    isSupported: () => true,
    restoreSilent: vi.fn().mockResolvedValue(null), // rien en local
    connect: vi.fn(),
  },
}));
vi.mock('../../infrastructure/fs/r2Adapter', () => ({
  R2Adapter: { connect: vi.fn().mockResolvedValue(null) }, // R2 indisponible par défaut
}));

const { useLibrary } = await import('./library');
const { R2Adapter } = await import('../../infrastructure/fs/r2Adapter');

describe('useLibrary — repli sur la bibliothèque R2', () => {
  beforeEach(() => {
    useLibrary.setState({
      adapter: null,
      songs: [],
      ready: false,
      busy: false,
      error: null,
      source: null,
    });
  });

  it('restore() : sans dossier local ni R2, reste en mode dégradé (aucune bibliothèque)', async () => {
    await useLibrary.getState().restore();
    const s = useLibrary.getState();
    expect(s.source).toBeNull();
    expect(s.ready).toBe(false);
    expect(s.adapter).toBeNull();
  });

  it('restore() : sans dossier local, se connecte à R2 (adapter complet, export possible)', async () => {
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
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { R2Adapter } from './r2Adapter';

function mockFetch(impl: (url: string) => Response) {
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(impl(url))));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('R2Adapter.connect', () => {
  it('renvoie null si /api/r2-list échoue (R2 non configuré)', async () => {
    mockFetch(() => new Response(null, { status: 501 }));
    expect(await R2Adapter.connect()).toBeNull();
  });

  it('renvoie null si aucun .pro dans la liste', async () => {
    mockFetch(() => Response.json({ keys: ['Media/fond.jpg'] }));
    expect(await R2Adapter.connect()).toBeNull();
  });

  it('indexe les .pro et médias depuis les clés listées', async () => {
    mockFetch((url) => {
      if (url.includes('r2-list')) {
        return Response.json({
          keys: ['Libraries/JEM/Agnus.pro', 'Media/Assets/fond.jpg', 'notes.txt'],
        });
      }
      return new Response(null, { status: 404 });
    });
    const adapter = await R2Adapter.connect();
    expect(adapter).not.toBeNull();
    expect(adapter!.isAvailable()).toBe(true);
    expect(adapter!.listPresentations()).toEqual([
      { name: 'Agnus.pro', relPath: 'Libraries/JEM/Agnus.pro' },
    ]);
  });
});

describe('R2Adapter resolution', () => {
  async function connectWith(keys: string[]): Promise<R2Adapter> {
    mockFetch(() => Response.json({ keys }));
    const adapter = await R2Adapter.connect();
    if (!adapter) throw new Error('setup: adapter attendu');
    return adapter;
  }

  it('resolvePresentation récupère les octets via /api/r2-file', async () => {
    const adapter = await connectWith(['Libraries/JEM/Agnus.pro']);
    mockFetch((url) => {
      expect(url).toBe('/api/r2-file?key=Libraries%2FJEM%2FAgnus.pro');
      return new Response(new Uint8Array([1, 2, 3]));
    });
    const res = await adapter.resolvePresentation('Agnus.pro');
    expect(res).toEqual({
      relPath: 'Libraries/JEM/Agnus.pro',
      absPath: 'Libraries/JEM/Agnus.pro',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });

  it('resolvePresentation renvoie null pour un fichier inconnu', async () => {
    const adapter = await connectWith(['Libraries/JEM/Agnus.pro']);
    expect(await adapter.resolvePresentation('Inconnu.pro')).toBeNull();
  });

  it('resolveMedia récupère les octets du média indexé', async () => {
    const adapter = await connectWith(['Libraries/JEM/Agnus.pro', 'Media/Assets/fond.jpg']);
    mockFetch(() => new Response(new Uint8Array([9, 9])));
    expect(await adapter.resolveMedia('fond.jpg')).toEqual(new Uint8Array([9, 9]));
  });

  it('resolveMedia renvoie null si le média est absent', async () => {
    const adapter = await connectWith(['Libraries/JEM/Agnus.pro']);
    expect(await adapter.resolveMedia('inconnu.jpg')).toBeNull();
  });
});

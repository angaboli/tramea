import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchVerseText } from './fetchVerseText';

describe('fetchVerseText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renvoie le texte et la référence en cas de succès', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique…",
            reference: 'Jean 3',
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await fetchVerseText('Jean 3:16');
    expect(result.text).toContain('Dieu a tant aimé le monde');
    expect(result.reference).toBe('Jean 3');
  });

  it('lève une erreur claire si le service répond en erreur (ex. référence introuvable)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Référence introuvable : « xx ».' }), { status: 404 }),
      ),
    );
    await expect(fetchVerseText('xx')).rejects.toThrow('introuvable');
  });

  it('lève une erreur générique si la réponse n’est pas du JSON (ex. route absente en dev local)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 404 })));
    await expect(fetchVerseText('Jean 3:16')).rejects.toThrow();
  });
});

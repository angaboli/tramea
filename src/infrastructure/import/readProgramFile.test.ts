import { describe, it, expect, vi, afterEach } from 'vitest';
import { readProgramFile } from './readProgramFile';

function txtFile(content: string, name = 'programme.txt'): File {
  return new File([content], name, { type: 'text/plain' });
}

describe('readProgramFile — repli sans IA (pas de clé Gemini / API indisponible)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bascule sur le parser classique si /api/parse-program-ai répond en erreur (ex. clé manquante -> 500)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'GEMINI_API_KEY manquante sur le serveur' }), {
          status: 500,
        }),
      ),
    );
    const programme = await readProgramFile(txtFile('École du sabbat\nLa voix de Christ nous appelle\nH&L 201'));
    expect(programme.sections.length).toBeGreaterThan(0);
  });

  it('bascule sur le parser classique si la route /api renvoie du HTML (pas de fonction serverless en dev)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<!doctype html>...', { status: 404 })),
    );
    const programme = await readProgramFile(txtFile('École du sabbat\nLa voix de Christ nous appelle\nH&L 201'));
    expect(programme.sections.length).toBeGreaterThan(0);
  });

  it('bascule sur le parser classique si fetch échoue (réseau, CORS…)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const programme = await readProgramFile(txtFile('École du sabbat\nLa voix de Christ nous appelle\nH&L 201'));
    expect(programme.sections.length).toBeGreaterThan(0);
  });
});

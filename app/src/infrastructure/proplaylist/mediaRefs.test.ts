import { describe, it, expect } from 'vitest';
import { mediaBasenames } from './mediaRefs';

function bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

describe('mediaBasenames', () => {
  it('extrait le nom de base depuis un chemin Media/Assets/...', () => {
    const pro = bytes('xx\x00Media/Assets/sea-ocean-cold.jpg\x00yy');
    expect(mediaBasenames(pro)).toEqual(['sea-ocean-cold.jpg']);
  });

  it('gère les chemins Windows et déduplique', () => {
    const pro = bytes(
      'C:\\PP\\Media\\Import\\bg.png\x00Media/Import/bg.png\x00Media/Assets/clip.mp4',
    );
    const names = mediaBasenames(pro).sort();
    expect(names).toEqual(['bg.png', 'clip.mp4']);
  });

  it('retourne [] si aucun média', () => {
    expect(mediaBasenames(bytes('aucune image ici'))).toEqual([]);
  });

  it('reconnaît plusieurs extensions', () => {
    const pro = bytes('a/x.jpeg b/y.MOV c/z.webp');
    expect(mediaBasenames(pro).sort()).toEqual(['x.jpeg', 'y.MOV', 'z.webp']);
  });
});

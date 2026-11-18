import { describe, it, expect } from 'vitest';
import { stripRoot, isMediaPath, DirectoryInputAdapter } from './directoryInputAdapter';

describe('stripRoot', () => {
  it('retire le dossier racine choisi', () => {
    expect(stripRoot('ProPresenter/Libraries/JEM/Agnus.pro')).toBe('Libraries/JEM/Agnus.pro');
  });
  it('laisse un nom simple inchangé', () => {
    expect(stripRoot('Agnus.pro')).toBe('Agnus.pro');
  });
});

describe('isMediaPath', () => {
  it('reconnaît un chemin Media/', () => {
    expect(isMediaPath('Media/Assets/fond.jpg')).toBe(true);
    expect(isMediaPath('Libraries/x/Media/clip.mp4')).toBe(true);
  });
  it('rejette un .pro', () => {
    expect(isMediaPath('Libraries/JEM/Agnus.pro')).toBe(false);
  });
});

describe('DirectoryInputAdapter — homonymes', () => {
  const file = (rel: string, size: number) => {
    const f = new File([new Uint8Array(size)], rel.split('/').pop()!);
    Object.defineProperty(f, 'webkitRelativePath', { value: rel });
    return f;
  };

  it('garde la copie la plus grosse (pas la copie tronquée du dossier Default)', async () => {
    const a = new DirectoryInputAdapter([
      file('ProPresenter/Libraries/Default/TEMOIGNAGE - Abram.pro', 195),
      file('ProPresenter/Libraries/Titres/TEMOIGNAGE - Abram.pro', 4554),
    ]);
    const res = await a.resolvePresentation('TEMOIGNAGE - Abram.pro');
    expect(res!.bytes.length).toBe(4554);
    expect(res!.relPath).toBe('Libraries/Titres/TEMOIGNAGE - Abram.pro');
  });
});

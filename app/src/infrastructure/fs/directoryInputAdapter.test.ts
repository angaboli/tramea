import { describe, it, expect } from 'vitest';
import { stripRoot, isMediaPath } from './directoryInputAdapter';

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

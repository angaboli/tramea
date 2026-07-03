import { describe, it, expect } from 'vitest';
import { findSongByExactName, type LibrarySong } from './song';

const songs: LibrarySong[] = [
  { name: 'PRELUDE.pro', relPath: 'Libraries/PRELUDE.pro' },
  { name: 'Prière.pro', relPath: 'Libraries/Prière.pro' },
  { name: 'Service de Fidélité.pro', relPath: 'Libraries/Service de Fidélité.pro' },
];

describe('findSongByExactName', () => {
  it('correspond exactement (accents/casse ignorés)', () => {
    expect(findSongByExactName(songs, ['prelude'])?.name).toBe('PRELUDE.pro');
    expect(findSongByExactName(songs, ['service de fidelite'])?.name).toBe(
      'Service de Fidélité.pro',
    );
  });

  it('essaie les clés dans l’ordre (repli)', () => {
    // "priere a genoux" n'existe pas → repli sur "priere" (Prière.pro).
    expect(findSongByExactName(songs, ['priere a genoux', 'priere'])?.name).toBe('Prière.pro');
  });

  it('ne confond pas une clé proche (correspondance exacte uniquement)', () => {
    // Aucune diapo "Prière à genoux" dédiée dans cette bibliothèque : si on ne
    // demande QUE cette clé précise (sans repli), pas de correspondance.
    expect(findSongByExactName(songs, ['priere a genoux'])).toBeUndefined();
  });

  it('undefined si pas de matchKeys', () => {
    expect(findSongByExactName(songs, undefined)).toBeUndefined();
    expect(findSongByExactName(songs, [])).toBeUndefined();
  });

  it('undefined si aucune clé ne correspond', () => {
    expect(findSongByExactName(songs, ['inexistant'])).toBeUndefined();
  });
});

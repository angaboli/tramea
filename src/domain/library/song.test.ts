import { describe, it, expect } from 'vitest';
import {
  findSongByPrefix,
  matchSongInLibrary,
  parseSongFileName,
  searchSongs,
  type LibrarySong,
} from './song';

describe('findSongByPrefix', () => {
  const lib: LibrarySong[] = [
    { name: 'TEMOIGNAGE - Flavie.pro', relPath: 'a' },
    { name: 'TEMOIGNAGE - Abram de Dieu.pro', relPath: 'b' },
    { name: 'CHANT SPECIAL - Alexia.pro', relPath: 'c' },
    { name: 'Prélude.pro', relPath: 'd' },
  ];

  it('renvoie la PREMIÈRE diapo (alphabétique) qui commence par le préfixe', () => {
    expect(findSongByPrefix(lib, ['temoignage'])?.name).toBe('TEMOIGNAGE - Abram de Dieu.pro');
    expect(findSongByPrefix(lib, ['chant special'])?.name).toBe('CHANT SPECIAL - Alexia.pro');
  });

  it('undefined si aucun préfixe ne correspond', () => {
    expect(findSongByPrefix(lib, ['inexistant'])).toBeUndefined();
    expect(findSongByPrefix(lib, undefined)).toBeUndefined();
  });
});

describe('matchSongInLibrary', () => {
  const lib: LibrarySong[] = [
    { name: 'À toi la gloire - H&L 385.pro', relPath: 'L/À toi la gloire - H&L 385.pro' },
    { name: 'Quel ami fidèle - JEM 87.pro', relPath: 'L/Quel ami fidèle - JEM 87.pro' },
    { name: 'Grand Dieu nous te bénissons.pro', relPath: 'L/Grand Dieu nous te bénissons.pro' },
  ];

  it('lie par référence de recueil, même si le titre diffère', () => {
    expect(matchSongInLibrary(lib, { titre: 'Titre approximatif', ref: 'JEM 87' })?.name).toBe(
      'Quel ami fidèle - JEM 87.pro',
    );
  });

  it('la référence l’emporte (accents/casse/espaces ignorés)', () => {
    expect(matchSongInLibrary(lib, { titre: 'x', ref: 'h&l 385' })?.name).toBe(
      'À toi la gloire - H&L 385.pro',
    );
  });

  it('départage par le titre quand plusieurs .pro partagent la même référence', () => {
    const dup: LibrarySong[] = [
      { name: 'Instrumental - Change mon coeur JEM 369.pro', relPath: 'a' },
      { name: 'Change mon cœur, Seigneur - JEM 369.pro', relPath: 'b' },
    ];
    expect(matchSongInLibrary(dup, { titre: 'Change mon cœur Seigneur', ref: 'JEM 369' })?.name).toBe(
      'Change mon cœur, Seigneur - JEM 369.pro',
    );
  });

  it('repli flou sur le titre quand la référence est absente', () => {
    expect(matchSongInLibrary(lib, { titre: 'grand dieu' })?.name).toBe(
      'Grand Dieu nous te bénissons.pro',
    );
  });

  it('undefined si ni référence ni titre exploitables', () => {
    expect(matchSongInLibrary(lib, { titre: '' })).toBeUndefined();
    expect(matchSongInLibrary(lib, {})).toBeUndefined();
  });

  it('alias explicite : « Seigneur attire / Quel repos » → la diapo dédiée', () => {
    const withAlias: LibrarySong[] = [
      ...lib,
      { name: "Chant d'envoie 2026-03.pro", relPath: 'z' },
      { name: 'Seigneur attire - Quel repos.pro', relPath: 'y' },
    ];
    // Malgré un fichier au titre plus proche, l'alias l'emporte.
    expect(
      matchSongInLibrary(withAlias, { titre: 'Seigneur Attire / Quel Repos Céleste' })?.name,
    ).toBe("Chant d'envoie 2026-03.pro");
  });

  it('alias ignoré si le fichier visé est absent (repli normal)', () => {
    expect(matchSongInLibrary(lib, { titre: 'Seigneur attire quel repos' })).toBeUndefined();
  });
});

describe('parseSongFileName', () => {
  it('extrait titre et référence', () => {
    expect(parseSongFileName('Seigneur, mon âme soupire - H&L 508.pro')).toEqual({
      titre: 'Seigneur, mon âme soupire',
      ref: 'H&L 508',
    });
  });

  it('gère un doublon final et JEM', () => {
    expect(parseSongFileName('Agnus Dei - JEM 724 1.pro')).toEqual({
      titre: 'Agnus Dei',
      ref: 'JEM 724',
    });
  });

  it('normalise JEM KIDS', () => {
    expect(parseSongFileName('Tu es le Dieu fidèle - JEM KIDS 135.pro').ref).toBe(
      'JEM KIDS 135',
    );
  });

  it('sans référence', () => {
    expect(parseSongFileName('Mon cœur te cherche.pro')).toEqual({
      titre: 'Mon cœur te cherche',
      ref: '',
    });
  });
});

describe('searchSongs', () => {
  const songs: LibrarySong[] = [
    { name: 'Agnus Dei - JEM 724 1.pro', relPath: 'Libraries/JEM/Agnus Dei - JEM 724 1.pro' },
    { name: 'Au pied de Ton trône éternel.pro', relPath: 'Libraries/H&L/Au pied.pro' },
    { name: 'Digne es-tu - JEM 614.pro', relPath: 'Libraries/JEM/Digne es-tu - JEM 614.pro' },
  ];

  it('trouve par mot du titre', () => {
    const r = searchSongs(songs, 'agnus');
    expect(r).toHaveLength(1);
    expect(r[0].name).toContain('Agnus Dei');
  });

  it('trouve par référence', () => {
    expect(searchSongs(songs, 'jem 614')[0].name).toContain('Digne');
  });

  it('insensible aux accents', () => {
    expect(searchSongs(songs, 'trone eternel')[0].name).toContain('trône');
  });

  it('requête vide → tout (limité)', () => {
    expect(searchSongs(songs, '').length).toBe(3);
  });

  it('aucun résultat', () => {
    expect(searchSongs(songs, 'zzz')).toEqual([]);
  });
});

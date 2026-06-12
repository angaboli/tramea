import { describe, it, expect } from 'vitest';
import { parseSongFileName, searchSongs, type LibrarySong } from './song';

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

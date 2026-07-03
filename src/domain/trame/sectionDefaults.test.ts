import { describe, it, expect } from 'vitest';
import { SECTION_DEFAULT_ITEMS } from './sectionDefaults';
import { RECURRING_MOMENTS } from './recurring';
import { findSongByExactName, type LibrarySong } from '../library/song';

// Fichiers réels tirés d'un .proPlaylist de référence (diapos-titres).
const REAL_LIBRARY: LibrarySong[] = [
  'BENEDICTION.pro',
  'Bienvenue.pro',
  'ECOLE DU SABBAT.pro',
  'MEDITATION.pro',
  'MESSAGE POUR LES ENFANTS.pro',
  'POSTLUDE.pro',
  'PRELUDE.pro',
  'Prière.pro',
  'Service de Fidélité.pro',
].map((name) => ({ name, relPath: `Libraries/${name}` }));

describe('SECTION_DEFAULT_ITEMS', () => {
  it("École du sabbat, Prélude, Postlude trouvent leur .pro dans l'exemple réel", () => {
    expect(
      findSongByExactName(REAL_LIBRARY, SECTION_DEFAULT_ITEMS['ÉCOLE DU SABBAT'].matchKeys)?.name,
    ).toBe('ECOLE DU SABBAT.pro');
    expect(findSongByExactName(REAL_LIBRARY, SECTION_DEFAULT_ITEMS.PRÉLUDE.matchKeys)?.name).toBe(
      'PRELUDE.pro',
    );
    expect(findSongByExactName(REAL_LIBRARY, SECTION_DEFAULT_ITEMS.POSTLUDE.matchKeys)?.name).toBe(
      'POSTLUDE.pro',
    );
  });

  it('Annonces/Intercession : rien dans cet exemple (pas de faux positif)', () => {
    expect(findSongByExactName(REAL_LIBRARY, SECTION_DEFAULT_ITEMS.ANNONCES.matchKeys)).toBeUndefined();
    expect(
      findSongByExactName(REAL_LIBRARY, SECTION_DEFAULT_ITEMS.INTERCESSION.matchKeys),
    ).toBeUndefined();
  });

  it("Culte d'adoration / Temps de louanges : aucun default (contenu variable)", () => {
    expect(SECTION_DEFAULT_ITEMS["CULTE D'ADORATION"]).toBeUndefined();
    expect(SECTION_DEFAULT_ITEMS['TEMPS DE LOUANGES']).toBeUndefined();
  });
});

describe('RECURRING_MOMENTS', () => {
  const byLabel = (l: string) => RECURRING_MOMENTS.find((m) => m.label === l)!;

  it('Bienvenue, Service de fidélité, Message pour les enfants, Bénédiction se lient', () => {
    expect(findSongByExactName(REAL_LIBRARY, byLabel('Bienvenue').matchKeys)?.name).toBe(
      'Bienvenue.pro',
    );
    expect(
      findSongByExactName(REAL_LIBRARY, byLabel('Service de fidélité').matchKeys)?.name,
    ).toBe('Service de Fidélité.pro');
    expect(
      findSongByExactName(REAL_LIBRARY, byLabel('Message pour les enfants').matchKeys)?.name,
    ).toBe('MESSAGE POUR LES ENFANTS.pro');
    expect(findSongByExactName(REAL_LIBRARY, byLabel('Bénédiction').matchKeys)?.name).toBe(
      'BENEDICTION.pro',
    );
  });

  it('Méditation / Partage se lie via la clé dédiée "meditation"', () => {
    expect(findSongByExactName(REAL_LIBRARY, byLabel('Méditation / Partage').matchKeys)?.name).toBe(
      'MEDITATION.pro',
    );
  });

  it('Prière à genoux et Prière finale replient sur la diapo générique Prière.pro', () => {
    expect(findSongByExactName(REAL_LIBRARY, byLabel('Prière à genoux').matchKeys)?.name).toBe(
      'Prière.pro',
    );
    expect(findSongByExactName(REAL_LIBRARY, byLabel('Prière finale').matchKeys)?.name).toBe(
      'Prière.pro',
    );
  });

  it('Chant spécial : jamais de correspondance (pas de matchKeys)', () => {
    const moment = byLabel('Chant spécial');
    expect(moment.type).toBe('song');
    expect(moment.matchKeys).toBeUndefined();
    expect(findSongByExactName(REAL_LIBRARY, moment.matchKeys)).toBeUndefined();
  });

  it('Intercession se lie aussi via l’alias "Groupe de prière"', () => {
    const withAlias: LibrarySong[] = [{ name: 'Groupe de prière.pro', relPath: 'x' }];
    expect(findSongByExactName(withAlias, byLabel('Intercession').matchKeys)?.name).toBe(
      'Groupe de prière.pro',
    );
  });
});

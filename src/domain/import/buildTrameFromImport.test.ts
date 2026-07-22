import { describe, it, expect } from 'vitest';
import {
  buildTrameFromProgramme,
  injectMissingMoments,
  linkLibraryToProgramme,
} from './buildTrameFromImport';
import type { LibrarySong } from '../library/song';
import type { Programme } from '../trame/types';

const songs: LibrarySong[] = [
  { name: 'PRELUDE.pro', relPath: 'L/PRELUDE.pro' },
  { name: 'Bénédiction.pro', relPath: 'L/Bénédiction.pro' },
  { name: 'À toi la gloire - H&L 385.pro', relPath: 'L/À toi la gloire - H&L 385.pro' },
];

describe('linkLibraryToProgramme', () => {
  const lib: LibrarySong[] = [
    { name: 'À toi la gloire - H&L 385.pro', relPath: 'L/À toi la gloire - H&L 385.pro' },
    { name: 'PRELUDE.pro', relPath: 'L/PRELUDE.pro' },
    { name: 'Bénédiction.pro', relPath: 'L/Bénédiction.pro' },
  ];

  const prog: Programme = {
    id: 'p',
    date: '2026-07-25',
    titre: 'Programme importé',
    kind: 'programme',
    sections: [
      {
        id: 's',
        label: "CULTE D'ADORATION",
        items: [
          { id: '1', type: 'label', titre: 'Prélude', note: 'bande son' },
          { id: '2', type: 'song', titre: 'À toi la gloire', ref: 'H&L 385' },
          { id: '3', type: 'label', titre: 'Bénédiction', officiant: 'Anciennat' },
          { id: '4', type: 'label', titre: 'Lecture de la Bible' },
        ],
      },
    ],
  };

  const linked = linkLibraryToProgramme(prog, lib);

  it('conserve la structure, les ids et le kind (ne force rien)', () => {
    expect(linked.kind).toBe('programme');
    expect(linked.sections).toHaveLength(1);
    expect(linked.sections[0].items.map((i) => i.id)).toEqual(['1', '2', '3', '4']);
    expect(linked.titre).toBe('Programme importé');
  });

  it('lie le .pro des chants (par référence) et des moments récurrents', () => {
    const [prelude, chant, benediction, lecture] = linked.sections[0].items;
    expect(prelude.proFile).toBe('PRELUDE.pro'); // moment reconnu (accent ignoré)
    expect(prelude.note).toBe('bande son'); // métadonnées préservées
    expect(chant.proFile).toBe('À toi la gloire - H&L 385.pro');
    expect(benediction.proFile).toBe('Bénédiction.pro');
    expect(benediction.officiant).toBe('Anciennat');
    expect(lecture.proFile).toBeUndefined(); // ni chant ni moment connu
  });

  it('lie un moment par PRÉFIXE quand il n’y a pas de diapo exacte (Témoignages)', () => {
    const withTemoignage: Programme = {
      ...prog,
      sections: [
        { id: 's', label: "CULTE D'ADORATION", items: [{ id: '1', type: 'label', titre: 'Témoignages' }] },
      ],
    };
    const libWith = [...lib, { name: 'TEMOIGNAGE - Abram de Dieu.pro', relPath: 't' }];
    expect(linkLibraryToProgramme(withTemoignage, libWith).sections[0].items[0].proFile).toBe(
      'TEMOIGNAGE - Abram de Dieu.pro',
    );
  });

  it('ne réécrase pas un .pro déjà lié', () => {
    const withPro: Programme = {
      ...prog,
      sections: [
        {
          id: 's',
          label: 'X',
          items: [{ id: '1', type: 'song', titre: 'À toi la gloire', ref: 'H&L 385', proFile: 'Choix manuel.pro' }],
        },
      ],
    };
    expect(linkLibraryToProgramme(withPro, lib).sections[0].items[0].proFile).toBe('Choix manuel.pro');
  });
});

describe('injectMissingMoments', () => {
  it('insère les moments courants absents à leur place, sans dupliquer les présents', () => {
    const p: Programme = {
      id: 'p',
      date: '2026-07-25',
      titre: 'T',
      sections: [
        {
          id: 'c',
          label: "CULTE D'ADORATION",
          items: [
            { id: '1', type: 'label', titre: 'Prélude' },
            { id: '2', type: 'label', titre: 'Bénédiction' },
          ],
        },
      ],
    };
    const out = injectMissingMoments(p);
    const culte = out.sections.find((s) => s.label === "CULTE D'ADORATION")!;
    const labels = culte.items.map((i) => i.titre);

    // Les présents ne sont pas dupliqués…
    expect(labels.filter((l) => l === 'Prélude')).toHaveLength(1);
    expect(labels.filter((l) => l === 'Bénédiction')).toHaveLength(1);
    // …et l'ordre chronologique est respecté : Prélude avant Bienvenue (injecté)
    // avant Bénédiction avant Postlude (injecté).
    expect(labels.indexOf('Prélude')).toBeLessThan(labels.indexOf('Bienvenue'));
    expect(labels.indexOf('Bienvenue')).toBeLessThan(labels.indexOf('Bénédiction'));
    expect(labels.indexOf('Bénédiction')).toBeLessThan(labels.indexOf('Postlude'));
  });

  it('crée les sections d’accueil manquantes (Annonces, Intercession) au bon rang', () => {
    const p: Programme = {
      id: 'p',
      date: '2026-07-25',
      titre: 'T',
      sections: [
        { id: 'e', label: 'ÉCOLE DU SABBAT', items: [{ id: '1', type: 'song', titre: 'Chant' }] },
        { id: 'c', label: "CULTE D'ADORATION", items: [{ id: '2', type: 'label', titre: 'Prélude' }] },
      ],
    };
    const out = injectMissingMoments(p);
    const labels = out.sections.map((s) => s.label);
    // Annonces et Intercession créées ENTRE École du sabbat et Culte d'adoration.
    expect(labels.indexOf('ÉCOLE DU SABBAT')).toBeLessThan(labels.indexOf('ANNONCES'));
    expect(labels.indexOf('ANNONCES')).toBeLessThan(labels.indexOf('INTERCESSION'));
    expect(labels.indexOf('INTERCESSION')).toBeLessThan(labels.indexOf("CULTE D'ADORATION"));
  });
});

describe('buildTrameFromProgramme', () => {
  const programme: Programme = {
    id: 'src',
    date: '2026-07-25',
    titre: 'Église Adventiste — Sabbat',
    kind: 'programme',
    sections: [
      {
        id: 's',
        label: "CULTE D'ADORATION",
        items: [
          { id: '1', type: 'label', titre: 'Prélude' },
          { id: '2', type: 'song', titre: 'À toi la gloire', ref: 'H&L 385' },
          { id: '3', type: 'label', titre: 'Bénédiction' },
        ],
      },
    ],
  };
  const trame = buildTrameFromProgramme(programme, songs);

  it('produit une trame (kind trame, nouvel id) au titre/date du programme', () => {
    expect(trame.kind).toBe('trame');
    expect(trame.id).not.toBe('src');
    expect(trame.date).toBe('2026-07-25');
    expect(trame.titre).toBe('Église Adventiste — Sabbat');
  });

  it('lie les .pro (chant + moments) et injecte les moments manquants', () => {
    const culte = trame.sections.find((s) => s.label === "CULTE D'ADORATION")!;
    const prelude = culte.items.find((i) => i.titre === 'Prélude')!;
    const chant = culte.items.find((i) => i.titre === 'À toi la gloire')!;
    expect(prelude.proFile).toBe('PRELUDE.pro');
    expect(chant.proFile).toBe('À toi la gloire - H&L 385.pro');
    // moment injecté présent
    expect(culte.items.some((i) => i.titre === 'Bienvenue')).toBe(true);
  });
});

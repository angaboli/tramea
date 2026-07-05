import { describe, it, expect } from 'vitest';
import { concat, encBytesField, encStrField } from './protobuf';
import { extractGroupedLyrics } from './extractGroupedLyrics';

// Fabrique les octets d'une diapo : identité (f1.f1 = uuid) + RTF affiché au
// chemin réel f10/f23/f2/f1/f1/f1/f13/f5.
function slide(uuid: string, rtf: string): Uint8Array {
  const identity = encBytesField(1, encStrField(1, uuid));
  let rtfWrapped = encStrField(5, rtf);
  for (const f of [13, 1, 1, 1, 2, 23, 10]) rtfWrapped = encBytesField(f, rtfWrapped);
  return concat([identity, rtfWrapped]);
}

// Fabrique un groupe (f12) : nom + diapos membres (par uuid).
function group(name: string, memberUuids: string[]): Uint8Array {
  const header = encBytesField(1, encStrField(2, name));
  const members = memberUuids.map((u) => encBytesField(2, encStrField(1, u)));
  return concat([header, ...members]);
}

describe('extractGroupedLyrics', () => {
  it('associe chaque diapo à son groupe, dans l’ordre', () => {
    const uuidA = 'aaaaaaaa-0000-0000-0000-000000000000';
    const uuidB = 'bbbbbbbb-0000-0000-0000-000000000000';
    const bytes = concat([
      encBytesField(13, slide(uuidA, '{\\rtf1\\cb1 Toujours ta divine presence}')),
      encBytesField(13, slide(uuidB, '{\\rtf1\\cb1 Ou tu voudras je veux te suivre}')),
      encBytesField(12, group('Couplet 1', [uuidA])),
      encBytesField(12, group('Refrain', [uuidB])),
    ]);

    const result = extractGroupedLyrics(bytes);
    expect(result).toEqual([
      { groupe: 'Couplet 1', lignes: ['Toujours ta divine presence'] },
      { groupe: 'Refrain', lignes: ['Ou tu voudras je veux te suivre'] },
    ]);
  });

  it('un groupe qui revient (refrain répété) apparaît à chaque occurrence', () => {
    const uuidA = 'aaaaaaaa-0000-0000-0000-000000000000';
    const uuidB = 'bbbbbbbb-0000-0000-0000-000000000000';
    const uuidC = 'cccccccc-0000-0000-0000-000000000000';
    const bytes = concat([
      encBytesField(13, slide(uuidA, '{\\rtf1\\cb1 Couplet un}')),
      encBytesField(13, slide(uuidB, '{\\rtf1\\cb1 Le refrain}')),
      encBytesField(13, slide(uuidC, '{\\rtf1\\cb1 Couplet deux}')),
      encBytesField(13, slide(uuidB, '{\\rtf1\\cb1 Le refrain}')),
      encBytesField(12, group('Couplet 1', [uuidA])),
      encBytesField(12, group('Refrain', [uuidB])),
      encBytesField(12, group('Couplet 2', [uuidC])),
    ]);

    const result = extractGroupedLyrics(bytes);
    expect(result.map((r) => r.groupe)).toEqual(['Couplet 1', 'Refrain', 'Couplet 2', 'Refrain']);
  });

  it('sans groupes définis (f12 absent) : groupe = undefined pour toutes les diapos', () => {
    const uuidA = 'aaaaaaaa-0000-0000-0000-000000000000';
    const bytes = concat([encBytesField(13, slide(uuidA, '{\\rtf1\\cb1 Un texte simple}'))]);

    expect(extractGroupedLyrics(bytes)).toEqual([{ groupe: undefined, lignes: ['Un texte simple'] }]);
  });

  it('ignore les diapos sans texte (après nettoyage)', () => {
    const uuidA = 'aaaaaaaa-0000-0000-0000-000000000000';
    const bytes = concat([
      encBytesField(13, slide(uuidA, '{\\rtf1\\cb1 }')),
      encBytesField(12, group('Vide', [uuidA])),
    ]);
    expect(extractGroupedLyrics(bytes)).toEqual([]);
  });

  it('fusionne les diapos consécutives d’un même groupe en un seul paragraphe (comme un vrai couplet)', () => {
    const u1 = 'aaaaaaaa-0000-0000-0000-000000000001';
    const u2 = 'aaaaaaaa-0000-0000-0000-000000000002';
    const u3 = 'aaaaaaaa-0000-0000-0000-000000000003';
    const u4 = 'aaaaaaaa-0000-0000-0000-000000000004';
    const bytes = concat([
      encBytesField(13, slide(u1, '{\\rtf1\\cb1 Pres de Jesus, je trouve un sur asile.}')),
      encBytesField(13, slide(u2, '{\\rtf1\\cb1 Et si mon ciel est parfois menacant,}')),
      encBytesField(13, slide(u3, '{\\rtf1\\cb1 Il me rassure ; En Lui je suis tranquille :}')),
      encBytesField(13, slide(u4, '{\\rtf1\\cb1 Dans ma faiblesse agit son bras puissant.}')),
      encBytesField(12, group('Couplet 1', [u1, u2, u3, u4])),
    ]);

    expect(extractGroupedLyrics(bytes)).toEqual([
      {
        groupe: 'Couplet 1',
        lignes: [
          'Pres de Jesus, je trouve un sur asile.',
          'Et si mon ciel est parfois menacant,',
          'Il me rassure ; En Lui je suis tranquille :',
          'Dans ma faiblesse agit son bras puissant.',
        ],
      },
    ]);
  });

  it('ne fusionne PAS deux groupes différents qui se suivent', () => {
    const u1 = 'aaaaaaaa-0000-0000-0000-000000000001';
    const u2 = 'aaaaaaaa-0000-0000-0000-000000000002';
    const bytes = concat([
      encBytesField(13, slide(u1, '{\\rtf1\\cb1 Ligne du couplet}')),
      encBytesField(13, slide(u2, '{\\rtf1\\cb1 Ligne du refrain}')),
      encBytesField(12, group('Couplet 1', [u1])),
      encBytesField(12, group('Refrain', [u2])),
    ]);
    expect(extractGroupedLyrics(bytes).map((g) => g.groupe)).toEqual(['Couplet 1', 'Refrain']);
  });

  it('ne fusionne jamais les diapos SANS groupe entre elles', () => {
    const u1 = 'aaaaaaaa-0000-0000-0000-000000000001';
    const u2 = 'aaaaaaaa-0000-0000-0000-000000000002';
    // Aucun f12 : pas de groupes du tout.
    const bytes = concat([
      encBytesField(13, slide(u1, '{\\rtf1\\cb1 Premiere diapo}')),
      encBytesField(13, slide(u2, '{\\rtf1\\cb1 Deuxieme diapo}')),
    ]);
    expect(extractGroupedLyrics(bytes)).toEqual([
      { groupe: undefined, lignes: ['Premiere diapo'] },
      { groupe: undefined, lignes: ['Deuxieme diapo'] },
    ]);
  });

  it('retire le groupe « Introduction » (redondant avec le titre déjà affiché)', () => {
    const u1 = 'aaaaaaaa-0000-0000-0000-000000000001';
    const u2 = 'aaaaaaaa-0000-0000-0000-000000000002';
    const bytes = concat([
      encBytesField(13, slide(u1, '{\\rtf1\\cb1 Pres de Jesus - H&L 319}')),
      encBytesField(13, slide(u2, '{\\rtf1\\cb1 Ligne du couplet}')),
      encBytesField(12, group('Introduction', [u1])),
      encBytesField(12, group('Couplet 1', [u2])),
    ]);
    expect(extractGroupedLyrics(bytes)).toEqual([
      { groupe: 'Couplet 1', lignes: ['Ligne du couplet'] },
    ]);
  });
});

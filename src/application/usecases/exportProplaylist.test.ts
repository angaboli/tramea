import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { exportProplaylist, type ExportItem } from './exportProplaylist';
import type { FileSystemPort, ProResource } from '../../domain/ports/FileSystemPort';
import { walk, get, getAll, decodeUtf8, encBytesField, encStrField } from '../../infrastructure/proplaylist/protobuf';

function bytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

// .pro synthétique avec une diapo (chemin RTF affiché f10/f23/f2/f1/f1/f1/f13/f5) + nom.
function fakePro(): Uint8Array {
  let inner = bytes('{\\rtf0\\cb3}');
  for (const f of [5, 13, 1, 1, 1, 2, 23, 10]) inner = encBytesField(f, inner);
  return new Uint8Array([...encStrField(3, 'Base'), ...encBytesField(13, inner)]);
}

function fakeFs(
  pros: Record<string, ProResource>,
  media: Record<string, Uint8Array>,
  available = true,
): FileSystemPort {
  return {
    isAvailable: () => available,
    listPresentations: () =>
      Object.entries(pros).map(([name, r]) => ({ name, relPath: r.relPath })),
    resolvePresentation: async (name) => pros[name] ?? null,
    resolveMedia: async (base) => media[base] ?? null,
  };
}

const items: ExportItem[] = [
  { kind: 'header', label: 'TEMPS DE LOUANGES' },
  { kind: 'song', label: 'Agnus Dei', proFile: 'Agnus Dei.pro' },
  { kind: 'song', label: 'Chant absent', proFile: 'Absent.pro' },
];

const pros: Record<string, ProResource> = {
  'Agnus Dei.pro': {
    relPath: 'Libraries/JEM/Agnus Dei.pro',
    absPath: 'C:/PP/Libraries/JEM/Agnus Dei.pro',
    bytes: bytes('PRO...Media/Assets/fond.jpg...end'),
  },
};

describe('exportProplaylist', () => {
  it('produit un zip valide avec data, .pro et média', async () => {
    const res = await exportProplaylist(
      { playlistName: 'sabbat 13/06/26', items },
      fakeFs(pros, { 'fond.jpg': bytes('JPEGDATA') }),
    );

    expect(res.proCount).toBe(1);
    expect(res.mediaCount).toBe(1);
    expect(res.missingPresentations).toEqual(['Chant absent']);
    expect(res.missingMedia).toEqual([]);

    const files = unzipSync(res.zip);
    expect(Object.keys(files)).toContain('data');
    expect(Object.keys(files)).toContain('Agnus Dei.pro');
    expect(Object.keys(files)).toContain('Media/fond.jpg');

    // Le data référence bien la playlist + 3 items (header + fichier + repère).
    const top = walk(files['data']);
    const pl = walk(get(walk(get(top, 3) as Uint8Array), 12) as Uint8Array);
    const playlist = walk(get(pl, 1) as Uint8Array);
    expect(decodeUtf8(get(playlist, 2) as Uint8Array)).toBe('sabbat 13/06/26');
    const container = walk(get(playlist, 13) as Uint8Array);
    expect(getAll(container, 1).length).toBe(3);
  });

  it('bundle un chant personnalisé (medley) en clonant le .pro de base', async () => {
    const base: Record<string, ProResource> = {
      'Base.pro': { relPath: 'Libraries/Base.pro', absPath: 'Libraries/Base.pro', bytes: fakePro() },
    };
    const res = await exportProplaylist(
      {
        playlistName: 'x',
        items: [{ kind: 'custom', label: 'Mon Medley', baseProFile: 'Base.pro', slides: ['Strophe A'] }],
      },
      fakeFs(base, {}),
    );
    expect(res.proCount).toBe(1);
    const files = unzipSync(res.zip);
    expect(Object.keys(files)).toContain('Mon Medley.pro');
    // Le .pro généré porte le nouveau titre.
    expect(decodeUtf8(get(walk(files['Mon Medley.pro']), 3) as Uint8Array)).toBe('Mon Medley');
  });

  it('signale un média introuvable sans planter', async () => {
    const res = await exportProplaylist(
      { playlistName: 'x', items },
      fakeFs(pros, {}),
    );
    expect(res.missingMedia).toEqual(['fond.jpg']);
    expect(res.mediaCount).toBe(0);
  });

  it('échoue proprement si aucun dossier disponible', async () => {
    await expect(
      exportProplaylist({ playlistName: 'x', items }, fakeFs({}, {}, false)),
    ).rejects.toThrow(/dossier ProPresenter/);
  });
});

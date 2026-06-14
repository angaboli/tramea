/**
 * Cas d'usage — exporter un .proPlaylist.
 * Dépend de l'abstraction FileSystemPort (I/O injectée) ; les helpers de
 * sérialisation sont des fonctions pures (encodeur protobuf, zip).
 */
import type { FileSystemPort } from '../../domain/ports/FileSystemPort';
import {
  buildProplaylistData,
  type PlaylistItem,
} from '../../infrastructure/proplaylist/buildData';
import { assembleProplaylistZip } from '../../infrastructure/proplaylist/assembleZip';
import { mediaBasenames } from '../../infrastructure/proplaylist/mediaRefs';
import { retextPro } from '../../infrastructure/proplaylist/retextPro';

/** Élément de séquence en entrée : bandeau, chant lié, ou chant personnalisé (medley). */
export type ExportItem =
  | { kind: 'header'; label: string }
  | { kind: 'song'; label: string; proFile: string }
  | { kind: 'custom'; label: string; baseProFile: string; slides: string[] };

export interface ExportInput {
  playlistName: string;
  items: ExportItem[];
}

export interface ExportResult {
  zip: Uint8Array;
  proCount: number;
  mediaCount: number;
  /** Chants dont le .pro est introuvable → insérés comme repères « [A AJOUTER] ». */
  missingPresentations: string[];
  /** Médias référencés mais introuvables (l'import ProPresenter le signalera). */
  missingMedia: string[];
}

export async function exportProplaylist(
  input: ExportInput,
  fs: FileSystemPort,
): Promise<ExportResult> {
  if (!fs.isAvailable()) {
    throw new Error(
      "Aucun dossier ProPresenter sélectionné : l'export .proPlaylist nécessite un dossier.",
    );
  }

  const playlistItems: PlaylistItem[] = [];
  const presentations: Record<string, Uint8Array> = {};
  const media: Record<string, Uint8Array> = {};
  const missingPresentations: string[] = [];
  const missingMedia = new Set<string>();

  async function bundleMedia(proBytes: Uint8Array) {
    for (const mname of mediaBasenames(proBytes)) {
      if (media[mname]) continue;
      const bytes = await fs.resolveMedia(mname);
      if (bytes) media[mname] = bytes;
      else missingMedia.add(mname);
    }
  }
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-');

  for (const item of input.items) {
    if (item.kind === 'header') {
      playlistItems.push({ type: 'header', label: item.label });
      continue;
    }

    if (item.kind === 'custom') {
      // Medley : on clone le .pro de base et on remplace le texte des diapos.
      const base = await fs.resolvePresentation(item.baseProFile);
      if (!base) {
        playlistItems.push({ type: 'header', label: `[A AJOUTER] ${item.label}` });
        missingPresentations.push(item.label);
        continue;
      }
      const { bytes } = retextPro(base.bytes, { title: item.label, slides: item.slides });
      const fileName = `${safe(item.label)}.pro`;
      presentations[fileName] = bytes;
      const relPath = `Libraries/${fileName}`;
      playlistItems.push({ type: 'file', label: item.label, absPath: relPath, relPath });
      await bundleMedia(bytes);
      continue;
    }

    const res = await fs.resolvePresentation(item.proFile);
    if (!res) {
      // Chant introuvable : repère visible, jamais une erreur bloquante.
      playlistItems.push({ type: 'header', label: `[A AJOUTER] ${item.label}` });
      missingPresentations.push(item.label);
      continue;
    }

    const baseName = res.relPath.split(/[\\/]/).pop()!;
    presentations[baseName] = res.bytes;
    playlistItems.push({
      type: 'file',
      label: item.label,
      absPath: res.absPath,
      relPath: res.relPath,
    });
    await bundleMedia(res.bytes);
  }

  const data = buildProplaylistData(input.playlistName, playlistItems);
  const zip = assembleProplaylistZip({ data, presentations, media });

  return {
    zip,
    proCount: Object.keys(presentations).length,
    mediaCount: Object.keys(media).length,
    missingPresentations,
    missingMedia: [...missingMedia],
  };
}

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

/** Élément de séquence en entrée : bandeau de section, ou chant (lié à un .pro). */
export type ExportItem =
  | { kind: 'header'; label: string }
  | { kind: 'song'; label: string; proFile: string };

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

  for (const item of input.items) {
    if (item.kind === 'header') {
      playlistItems.push({ type: 'header', label: item.label });
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

    // Médias référencés par ce .pro.
    for (const mname of mediaBasenames(res.bytes)) {
      if (media[mname]) continue;
      const bytes = await fs.resolveMedia(mname);
      if (bytes) media[mname] = bytes;
      else missingMedia.add(mname);
    }
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

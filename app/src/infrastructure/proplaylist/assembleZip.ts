/**
 * Assemble une archive .proPlaylist (ZIP) à partir du `data`, des `.pro` et des
 * médias. Structure identique à l'export natif ProPresenter :
 *   data · <Chant>.pro (racine) · Media/<fichier> · PDF/
 */
import { zipSync, type Zippable } from 'fflate';

export interface ProplaylistBundle {
  data: Uint8Array;
  /** nom de fichier .pro (racine) → octets */
  presentations: Record<string, Uint8Array>;
  /** nom de base du média → octets */
  media: Record<string, Uint8Array>;
}

export function assembleProplaylistZip(bundle: ProplaylistBundle): Uint8Array {
  const entries: Zippable = { data: bundle.data, 'PDF/': new Uint8Array() };
  for (const [name, bytes] of Object.entries(bundle.presentations)) {
    entries[name] = bytes;
  }
  const mediaFolder: Record<string, Uint8Array> = {};
  for (const [name, bytes] of Object.entries(bundle.media)) {
    mediaFolder[name] = bytes;
  }
  (entries as Record<string, unknown>).Media = mediaFolder;
  // mtime fixe (dans la plage ZIP 1980-2099) pour des archives reproductibles.
  return zipSync(entries, { mtime: new Date('2020-01-01T00:00:00Z') });
}

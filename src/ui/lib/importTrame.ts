/**
 * Import d'un fichier programme → crée DEUX enregistrements persistés :
 *   1. le PROGRAMME (structure fidèle du PDF, `.pro` liés → paroles au PDF) ;
 *   2. la TRAME dérivée (moments courants manquants injectés, `.pro` liés →
 *      prête pour l'export ProPresenter).
 * La trame est chargée dans l'éditeur ; le programme reste consultable dans la
 * liste. Les deux sont sauvegardés en base immédiatement (pas de dépendance à
 * l'autosave). Renvoie la trame chargée.
 *
 * En cas d'échec d'enregistrement (ex. base indisponible), la trame est tout de
 * même chargée dans l'éditeur et l'erreur est propagée pour affichage.
 */
import type { LibrarySong } from '../../domain/library/song';
import type { Programme } from '../../domain/trame/types';
import {
  buildTrameFromProgramme,
  linkLibraryToProgramme,
} from '../../domain/import/buildTrameFromImport';
import { readProgramFile } from '../../infrastructure/import/readProgramFile';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSavedProgrammes } from '../stores/savedProgrammes';

export async function importProgrammeAndTrame(
  file: File,
  songs: readonly LibrarySong[],
): Promise<Programme> {
  const scraped = await readProgramFile(file);
  const programme: Programme = { ...linkLibraryToProgramme(scraped, songs), kind: 'programme' };
  const trame = buildTrameFromProgramme(programme, songs);

  // Charge la trame dans l'éditeur AVANT la persistance : même si la sauvegarde
  // échoue, l'utilisateur voit son résultat (l'autosave retentera).
  useProgrammeEditor.getState().load(trame);

  const saved = useSavedProgrammes.getState();
  await saved.save(programme);
  await saved.save(trame);

  return trame;
}

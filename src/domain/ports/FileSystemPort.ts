/**
 * Port d'accès au dossier ProPresenter (abstraction).
 * Implémenté par la File System Access API (navigateur) ou un adapter mémoire
 * (tests). L'application ne dépend que de cette interface.
 *
 * Le dossier est une CAPACITÉ OPTIONNELLE : si aucun dossier n'est choisi,
 * l'app reste utilisable en mode dégradé (programme + PDF), seul l'export
 * `.proPlaylist` est indisponible.
 */

export interface ProResource {
  /** Chemin relatif au dossier ProPresenter, ex "Libraries/JEM/Agnus Dei.pro". */
  relPath: string;
  /** Chemin absolu local (informatif, écrit dans le `data`). */
  absPath: string;
  /** Octets du fichier `.pro`. */
  bytes: Uint8Array;
}

export interface PresentationRef {
  /** Nom de fichier .pro (basename). */
  name: string;
  /** Chemin relatif au dossier ProPresenter. */
  relPath: string;
}

export interface FileSystemPort {
  /** Un dossier ProPresenter est-il actuellement disponible ? */
  isAvailable(): boolean;
  /** Index des présentations `.pro` disponibles (pour la recherche). */
  listPresentations(): PresentationRef[];
  /** Résout un `.pro` par nom de fichier (basename). null si absent. */
  resolvePresentation(fileName: string): Promise<ProResource | null>;
  /** Lit un média par nom de base. null si absent. */
  resolveMedia(basename: string): Promise<Uint8Array | null>;
}

import type { Programme } from '../trame/types';

export interface SavedProgramme {
  programme: Programme;
  /** Horodatage (ms) de la dernière sauvegarde. */
  updatedAt: number;
}

/**
 * Port de persistance des programmes (abstraction).
 * Implémenté par IndexedDB (local) ; l'application n'en connaît que l'interface.
 */
export interface ProgrammeRepositoryPort {
  save(programme: Programme): Promise<void>;
  /** Liste triée par date de mise à jour décroissante (plus récent d'abord). */
  list(): Promise<SavedProgramme[]>;
  get(id: string): Promise<Programme | null>;
  remove(id: string): Promise<void>;
}

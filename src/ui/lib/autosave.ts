import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSavedProgrammes } from '../stores/savedProgrammes';
import { programmeRepository } from '../../infrastructure/persistence/programmeRepository';
import type { Programme } from '../../domain/trame/types';

const DEBOUNCE_MS = 600;

function isEmpty(p: Programme): boolean {
  return !p.titre.trim() && p.sections.length === 0;
}

/**
 * Sauvegarde automatique du programme en cours (IndexedDB), avec anti-rebond.
 * À appeler une fois au démarrage. Ne sauvegarde pas un programme vide.
 */
export function setupAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const unsub = useProgrammeEditor.subscribe((state, prev) => {
    if (state.programme === prev.programme) return;
    const p = state.programme;
    if (isEmpty(p)) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await programmeRepository.save(p);
      await useSavedProgrammes.getState().refresh();
    }, DEBOUNCE_MS);
  });

  return () => {
    clearTimeout(timer);
    unsub();
  };
}

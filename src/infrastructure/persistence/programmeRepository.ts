/**
 * Sélection du dépôt de persistance des programmes/trames.
 * — Supabase (cloud PARTAGÉ) dès que les variables d'env sont présentes :
 *   les trames sont gardées sur le serveur et visibles depuis n'importe quel
 *   poste, peu importe qui les a créées.
 * — Sinon, repli sur IndexedDB (local au navigateur) pour le dev hors-ligne.
 * L'application ne dépend que du port (ProgrammeRepositoryPort).
 */
import type { ProgrammeRepositoryPort } from '../../domain/ports/ProgrammeRepositoryPort';
import { isSupabaseConfigured } from '../supabase/client';
import { IdbProgrammeRepository } from './idbProgrammeRepository';
import { SupabaseProgrammeRepository } from './supabaseProgrammeRepository';

export const programmeRepository: ProgrammeRepositoryPort = isSupabaseConfigured
  ? new SupabaseProgrammeRepository()
  : new IdbProgrammeRepository();

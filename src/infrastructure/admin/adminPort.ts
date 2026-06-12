/**
 * Sélection de l'implémentation d'AdminPort : Supabase si configuré, sinon
 * l'adapter local (démo en mémoire).
 */
import type { AdminPort } from '../../domain/ports/AdminPort';
import { localAdminAdapter } from './localAdminAdapter';
import { supabaseAdminAdapter } from '../supabase/supabaseAdminAdapter';
import { isSupabaseConfigured } from '../supabase/client';

export const adminPort: AdminPort = isSupabaseConfigured
  ? supabaseAdminAdapter
  : localAdminAdapter;

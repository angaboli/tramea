/**
 * Sélection de l'implémentation d'AuthPort :
 * - Supabase (lien magique réel) si configuré (VITE_SUPABASE_URL/ANON_KEY) ;
 * - sinon l'adapter LOCAL (dev), sans backend.
 * L'UI (garde d'accès, écrans) ne dépend que du port — rien à changer.
 */
import type { AuthPort } from '../../domain/ports/AuthPort';
import { localAuthAdapter } from './localAuthAdapter';
import { supabaseAuthAdapter } from '../supabase/supabaseAuthAdapter';
import { isSupabaseConfigured } from '../supabase/client';

export const isRealAuth = isSupabaseConfigured;

export const authPort: AuthPort = isSupabaseConfigured
  ? supabaseAuthAdapter
  : localAuthAdapter;

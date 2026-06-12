/**
 * Client Supabase, créé uniquement si les variables d'environnement sont
 * présentes. Sinon `supabase` vaut null et l'app utilise l'adapter d'auth local
 * (mode dev). La clé utilisée est la clé ANON (jamais la clé service).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

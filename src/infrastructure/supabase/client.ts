/**
 * Client Supabase, créé uniquement si les variables d'environnement sont
 * présentes. Sinon `supabase` vaut null et l'app utilise l'adapter d'auth local
 * (mode dev). La clé utilisée est la clé ANON (jamais la clé service).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Clé publique : nouveau nom Supabase (publishable) ou ancien (anon). Jamais la clé service.
const publicKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && publicKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publicKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

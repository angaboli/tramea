import type { Session } from '../auth/types';

/**
 * Port d'authentification (abstraction). L'application dépend de cette interface,
 * jamais d'une implémentation concrète (Supabase, local, mock…).
 */
export interface AuthPort {
  /** Session courante (depuis le cache local / le fournisseur), ou null. */
  getSession(): Promise<Session | null>;
  /** Envoie un lien magique à l'email. */
  sendMagicLink(email: string): Promise<void>;
  /**
   * Finalise la connexion (en prod : déclenché par le retour du lien magique).
   * Renvoie la session — `pending` pour un nouvel utilisateur (deny-by-default).
   */
  completeLogin(email: string): Promise<Session>;
  signOut(): Promise<void>;
}

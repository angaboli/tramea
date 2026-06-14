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
  /** Connexion par mot de passe (instantanée, sans email). Optionnel. */
  signInWithPassword?(email: string, password: string): Promise<Session>;
  /** Création de compte (email + mot de passe choisi). Statut `pending` ensuite. */
  signUp?(email: string, password: string): Promise<Session>;
  /**
   * Finalise la connexion (en prod : déclenché par le retour du lien magique).
   * Renvoie la session — `pending` pour un nouvel utilisateur (deny-by-default).
   */
  completeLogin(email: string): Promise<Session>;
  signOut(): Promise<void>;
  /**
   * S'abonne aux changements d'état d'auth (ex. retour du lien magique).
   * Renvoie une fonction de désabonnement. Optionnel (no-op en local).
   */
  onAuthChange?(callback: () => void): () => void;
}

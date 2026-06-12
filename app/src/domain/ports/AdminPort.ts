import type { Role, AccountStatus, UserAccount } from '../auth/types';

/**
 * Port d'administration des comptes (abstraction).
 * Implémenté par Supabase (RLS : réservé aux admins) ou un adapter local (démo).
 */
export interface AdminPort {
  /** Disponible seulement avec un backend réel (Supabase). */
  isAvailable(): boolean;
  listUsers(): Promise<UserAccount[]>;
  /** Approuve un compte en lui attribuant un rôle. */
  approve(id: string, role: Role): Promise<void>;
  setRole(id: string, role: Role): Promise<void>;
  setStatus(id: string, status: AccountStatus): Promise<void>;
}

/**
 * Domaine — authentification & autorisation.
 * Couche PURE (aucune dépendance Supabase/React).
 */

/** Rôles applicatifs. `null` = approuvé mais sans rôle attribué (ne devrait pas arriver). */
export type Role = 'basic' | 'advanced' | 'admin';

export type AccountStatus = 'pending' | 'approved' | 'suspended';

export interface Session {
  email: string;
  status: AccountStatus;
  /** Attribué par un admin à l'approbation ; absent tant que `pending`. */
  role: Role | null;
}

/** Compte utilisateur, tel que vu par un administrateur. */
export interface UserAccount {
  id: string;
  email: string;
  role: Role | null;
  status: AccountStatus;
}

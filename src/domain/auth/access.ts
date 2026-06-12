import type { Role, Session } from './types';

/**
 * Règles d'accès — deny-by-default (security-first).
 * L'accès n'est accordé que si le compte est `approved` ET porte un rôle.
 */
export function hasAccess(session: Session | null): boolean {
  return !!session && session.status === 'approved' && session.role !== null;
}

export function isPending(session: Session | null): boolean {
  return !!session && session.status === 'pending';
}

/** Hiérarchie : admin ⊇ advanced ⊇ basic. */
const RANK: Record<Role, number> = { basic: 1, advanced: 2, admin: 3 };

export function atLeast(role: Role | null, min: Role): boolean {
  return role !== null && RANK[role] >= RANK[min];
}

/** Capacités métier, dérivées du rôle. */
export function canCreateProgramme(session: Session | null): boolean {
  return hasAccess(session) && atLeast(session!.role, 'basic');
}

export function canCreateTrame(session: Session | null): boolean {
  return hasAccess(session) && atLeast(session!.role, 'advanced');
}

export function canManageUsers(session: Session | null): boolean {
  return hasAccess(session) && atLeast(session!.role, 'admin');
}

/**
 * Adapter d'administration LOCAL (démo, sans backend).
 * Liste en mémoire seedée avec quelques comptes pour démontrer le flux
 * d'approbation. Réinitialisée au rechargement. Remplacé par Supabase en prod.
 */
import type { AdminPort } from '../../domain/ports/AdminPort';
import type { Role, AccountStatus, UserAccount } from '../../domain/auth/types';

const users: UserAccount[] = [
  { id: 'u1', email: 'nouveau.membre@eglise.org', role: null, status: 'pending' },
  { id: 'u2', email: 'projectionniste@eglise.org', role: null, status: 'pending' },
  { id: 'u3', email: 'pasteur@eglise.org', role: 'advanced', status: 'approved' },
];

export const localAdminAdapter: AdminPort = {
  isAvailable() {
    return true;
  },
  async listUsers() {
    return users.map((u) => ({ ...u }));
  },
  async approve(id, role) {
    update(id, { role, status: 'approved' });
  },
  async setRole(id, role) {
    update(id, { role });
  },
  async setStatus(id, status) {
    update(id, { status });
  },
};

function update(id: string, patch: Partial<{ role: Role; status: AccountStatus }>) {
  const u = users.find((x) => x.id === id);
  if (u) Object.assign(u, patch);
}

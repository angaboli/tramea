import { create } from 'zustand';
import type { Role, AccountStatus, UserAccount } from '../../domain/auth/types';
import { adminPort } from '../../infrastructure/admin/adminPort';

interface AdminState {
  users: UserAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  approve: (id: string, role: Role) => Promise<void>;
  setRole: (id: string, role: Role) => Promise<void>;
  setStatus: (id: string, status: AccountStatus) => Promise<void>;
}

async function run(set: (p: Partial<AdminState>) => void, fn: () => Promise<void>) {
  try {
    await fn();
    set({ users: await adminPort.listUsers(), error: null });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'Erreur' });
  }
}

export const useAdminUsers = create<AdminState>((set) => ({
  users: [],
  loading: false,
  error: null,
  async refresh() {
    set({ loading: true, error: null });
    try {
      set({ users: await adminPort.listUsers(), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Erreur' });
    }
  },
  approve: (id, role) => run(set, () => adminPort.approve(id, role)),
  setRole: (id, role) => run(set, () => adminPort.setRole(id, role)),
  setStatus: (id, status) => run(set, () => adminPort.setStatus(id, status)),
}));

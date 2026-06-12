/**
 * Adapter d'administration Supabase → AdminPort.
 * Les lectures/écritures sur `profiles` sont protégées par RLS : seul un admin
 * approuvé peut lister et modifier les comptes (voir supabase/schema.sql).
 */
import type { AdminPort } from '../../domain/ports/AdminPort';
import type { Role, AccountStatus, UserAccount } from '../../domain/auth/types';
import { supabase } from './client';

export const supabaseAdminAdapter: AdminPort = {
  isAvailable() {
    return supabase !== null;
  },

  async listUsers() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, status');
    if (error) throw new Error(error.message);
    return (data ?? []) as UserAccount[];
  },

  async approve(id: string, role: Role) {
    await this.setRoleAndStatus(id, role, 'approved');
  },

  async setRole(id: string, role: Role) {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async setStatus(id: string, status: AccountStatus) {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Helper interne (non exposé par le port).
  async setRoleAndStatus(id: string, role: Role, status: AccountStatus) {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.from('profiles').update({ role, status }).eq('id', id);
    if (error) throw new Error(error.message);
  },
} as AdminPort & {
  setRoleAndStatus(id: string, role: Role, status: AccountStatus): Promise<void>;
};

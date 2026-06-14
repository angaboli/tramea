/**
 * Adapter d'authentification Supabase (lien magique) → AuthPort.
 * Le statut (pending/approved) et le rôle proviennent de la table `profiles`
 * (voir supabase/schema.sql), protégée par RLS. Deny-by-default : tant que le
 * profil n'est pas `approved` avec un rôle, l'accès est refusé.
 */
import type { AuthPort } from '../../domain/ports/AuthPort';
import type { Session, Role, AccountStatus } from '../../domain/auth/types';
import { supabase } from './client';

interface ProfileRow {
  email: string;
  role: Role | null;
  status: AccountStatus;
}

async function sessionFromAuth(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role, status')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  // Pas encore de profil (trigger en cours) → considéré en attente.
  return {
    email: profile?.email ?? user.email ?? '',
    status: profile?.status ?? 'pending',
    role: profile?.role ?? null,
  };
}

export const supabaseAuthAdapter: AuthPort = {
  async getSession() {
    return sessionFromAuth();
  },

  async sendMagicLink(email: string) {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
  },

  async signInWithPassword(email: string, password: string) {
    if (!supabase) throw new Error('Supabase non configuré.');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message);
    const s = await sessionFromAuth();
    if (!s) throw new Error('Connexion échouée.');
    return s;
  },

  async completeLogin() {
    // Avec le lien magique, la session est établie au retour du lien
    // (detectSessionInUrl). On relit simplement la session courante.
    const s = await sessionFromAuth();
    if (!s) throw new Error('Connexion non finalisée.');
    return s;
  },

  async signOut() {
    if (supabase) await supabase.auth.signOut();
  },

  onAuthChange(callback: () => void) {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange(() => callback());
    return () => data.subscription.unsubscribe();
  },
};

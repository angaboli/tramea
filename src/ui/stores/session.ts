import { create } from 'zustand';
import type { Session } from '../../domain/auth/types';
import { authPort } from '../../infrastructure/auth/authPort';

// Clean architecture : l'UI dépend du port, pas de l'implémentation
// (Supabase réel si configuré, sinon adapter local).
const auth = authPort;

// Contournement TEMPORAIRE de l'auth (VITE_AUTH_DISABLED=true) : accès admin
// direct, sans connexion. À remettre à false une fois Supabase stabilisé.
const bypassAuth = import.meta.env.VITE_AUTH_DISABLED === 'true';
const BYPASS_SESSION: Session = { email: 'admin@local', status: 'approved', role: 'admin' };

type Phase = 'loading' | 'anonymous' | 'link-sent' | 'authenticated';

interface SessionState {
  phase: Phase;
  session: Session | null;
  pendingEmail: string | null;
  init: () => Promise<void>;
  sendLink: (email: string) => Promise<void>;
  signInPassword: (email: string, password: string) => Promise<void>;
  signUpPassword: (email: string, password: string) => Promise<void>;
  completeLogin: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  phase: 'loading',
  session: null,
  pendingEmail: null,

  async init() {
    if (bypassAuth) {
      set({ session: BYPASS_SESSION, phase: 'authenticated' });
      return;
    }
    const session = await auth.getSession();
    set({ session, phase: session ? 'authenticated' : 'anonymous' });
    // Réagit au retour du lien magique / déconnexion (Supabase) sans rechargement.
    auth.onAuthChange?.(async () => {
      const s = await auth.getSession();
      set({ session: s, phase: s ? 'authenticated' : 'anonymous', pendingEmail: null });
    });
  },

  async sendLink(email: string) {
    await auth.sendMagicLink(email);
    set({ phase: 'link-sent', pendingEmail: email.trim().toLowerCase() });
  },

  async signInPassword(email: string, password: string) {
    if (!auth.signInWithPassword) throw new Error('Connexion par mot de passe indisponible.');
    const session = await auth.signInWithPassword(email, password);
    set({ session, phase: 'authenticated' });
  },

  async signUpPassword(email: string, password: string) {
    if (!auth.signUp) throw new Error('Création de compte indisponible.');
    try {
      const session = await auth.signUp(email, password);
      set({ session, phase: 'authenticated' });
    } catch (e) {
      // "Confirm email" activé → compte créé, en attente de confirmation par email.
      if (e instanceof Error && e.message === 'CONFIRMATION_REQUIRED') {
        set({ phase: 'link-sent', pendingEmail: email.trim().toLowerCase() });
        return;
      }
      throw e;
    }
  },

  async completeLogin(email: string) {
    const session = await auth.completeLogin(email);
    set({ session, phase: 'authenticated' });
  },

  async signOut() {
    if (bypassAuth) return; // auth contournée : pas de déconnexion
    await auth.signOut();
    set({ session: null, phase: 'anonymous', pendingEmail: null });
  },
}));

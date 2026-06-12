import { create } from 'zustand';
import type { Session } from '../../domain/auth/types';
import type { AuthPort } from '../../domain/ports/AuthPort';
import { localAuthAdapter } from '../../infrastructure/auth/localAuthAdapter';

// Adapter injecté (remplaçable par Supabase). Clean architecture : l'UI dépend
// du port, pas de l'implémentation.
const auth: AuthPort = localAuthAdapter;

type Phase = 'loading' | 'anonymous' | 'link-sent' | 'authenticated';

interface SessionState {
  phase: Phase;
  session: Session | null;
  pendingEmail: string | null;
  init: () => Promise<void>;
  sendLink: (email: string) => Promise<void>;
  completeLogin: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  phase: 'loading',
  session: null,
  pendingEmail: null,

  async init() {
    const session = await auth.getSession();
    set({ session, phase: session ? 'authenticated' : 'anonymous' });
  },

  async sendLink(email: string) {
    await auth.sendMagicLink(email);
    set({ phase: 'link-sent', pendingEmail: email.trim().toLowerCase() });
  },

  async completeLogin(email: string) {
    const session = await auth.completeLogin(email);
    set({ session, phase: 'authenticated' });
  },

  async signOut() {
    await auth.signOut();
    set({ session: null, phase: 'anonymous', pendingEmail: null });
  },
}));

import type { AuthPort } from '../../domain/ports/AuthPort';
import type { Session } from '../../domain/auth/types';

/**
 * Adapter d'auth LOCAL (placeholder dev) implémentant AuthPort.
 * — Permet de faire fonctionner la garde d'accès sans backend.
 * — À remplacer par `supabaseAuthAdapter` (lien magique réel) une fois les
 *   identifiants Supabase configurés. La garde et les écrans ne changent pas.
 *
 * Règle conservée : un nouvel utilisateur est `pending` (aucun accès) tant qu'un
 * admin ne l'a pas approuvé. Un email admin de démo peut être fixé via
 * VITE_ADMIN_EMAIL pour disposer d'un premier accès.
 */
const SESSION_KEY = 'tramea.session';

function read(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function write(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

// Liste d'emails admin (séparés par des virgules ou des espaces).
const adminEmails = new Set(
  ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? '')
    .toLowerCase()
    .split(/[,\s]+/)
    .map((e) => e.trim())
    .filter(Boolean),
);

export const localAuthAdapter: AuthPort = {
  async getSession() {
    return read();
  },

  async sendMagicLink(email: string) {
    // En local : pas d'envoi réel. On mémorise l'intention (no-op visible).
    sessionStorage.setItem('tramea.pendingEmail', email.trim().toLowerCase());
  },

  async completeLogin(email: string) {
    const normalized = email.trim().toLowerCase();
    const isAdmin = adminEmails.has(normalized);
    const session: Session = isAdmin
      ? { email: normalized, status: 'approved', role: 'admin' }
      : { email: normalized, status: 'pending', role: null };
    write(session);
    return session;
  },

  async signInWithPassword(email: string) {
    // Dev local : pas de vrai mot de passe — accès immédiat (admin si configuré).
    return this.completeLogin(email);
  },

  async signUp(email: string) {
    // Dev local : équivalent à une connexion (statut admin/pending selon l'email).
    return this.completeLogin(email);
  },

  async signOut() {
    write(null);
  },
};

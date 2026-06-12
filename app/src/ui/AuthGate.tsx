import { useEffect, type ReactNode } from 'react';
import { useSession } from './stores/session';
import { hasAccess, isPending } from '../domain/auth/access';
import { LoginPage } from './screens/LoginPage';
import { PendingApproval } from './screens/PendingApproval';

/**
 * Garde d'accès — security-first / deny-by-default.
 * À la visite du site, tant que l'utilisateur n'est pas authentifié ET approuvé,
 * on affiche la page de connexion (ou l'écran d'attente). Le contenu protégé
 * n'est rendu que pour une session valide.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { phase, session, init } = useSession();

  useEffect(() => {
    void init();
  }, [init]);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        <div
          className="h-6 w-6 rounded-full border-2 border-border border-t-primary"
          style={{ animation: 'spin .7s linear infinite' }}
          aria-label="Chargement"
        />
      </div>
    );
  }

  if (hasAccess(session)) return <>{children}</>;
  if (isPending(session)) return <PendingApproval />;
  return <LoginPage />;
}

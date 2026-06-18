import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from '../stores/session';

export function PendingApproval() {
  const { session, signOut } = useSession();

  // Message adapté à la raison réelle du blocage.
  const suspended = session?.status === 'suspended';
  const approvedNoRole = session?.status === 'approved' && !session?.role;
  const title = suspended
    ? 'Compte suspendu'
    : approvedNoRole
      ? 'Rôle non attribué'
      : "Accès en attente d'approbation";
  const detail = suspended
    ? 'Votre compte a été suspendu. Contactez un administrateur pour le réactiver.'
    : approvedNoRole
      ? 'Votre compte est approuvé mais aucun rôle ne lui est encore attribué. Un administrateur doit vous donner un rôle (basique, avancé ou admin).'
      : 'Votre demande a bien été reçue. Un administrateur doit valider votre accès avant que vous puissiez utiliser Tramea.';

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <Card className="text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">{title}</h1>
            {session?.email && (
              <p className="mt-1 text-sm font-semibold text-text">{session.email}</p>
            )}
            <p className="mt-2 text-sm text-text-secondary">{detail}</p>
            <Button variant="ghost" full className="mt-6" onClick={() => signOut()}>
              Se déconnecter
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}

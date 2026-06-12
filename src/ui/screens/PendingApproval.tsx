import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from '../stores/session';

export function PendingApproval() {
  const { session, signOut } = useSession();
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
            <h1 className="text-xl font-bold">Accès en attente d'approbation</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Votre demande de connexion
              {session?.email ? (
                <>
                  {' '}pour <span className="font-semibold text-text">{session.email}</span>
                </>
              ) : null}{' '}
              a bien été reçue. Un administrateur doit valider votre accès avant que
              vous puissiez utiliser Tramea.
            </p>
            <Button variant="ghost" full className="mt-6" onClick={() => signOut()}>
              Se déconnecter
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
}

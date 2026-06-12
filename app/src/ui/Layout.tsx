import { Outlet } from 'react-router-dom';
import { Badge } from './components/Badge';
import { Button } from './components/Button';
import { ThemeToggle } from './components/ThemeToggle';
import { useSession } from './stores/session';

const ROLE_LABEL: Record<string, string> = {
  basic: 'Basique',
  advanced: 'Avancé',
  admin: 'Admin',
};

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="3.5" y1="5" x2="14.5" y2="5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3.5" y1="9" x2="11" y2="9" stroke="#FF6C1A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3.5" y1="13" x2="14.5" y2="13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-bold">Tramea</div>
        <div className="text-xs text-text-muted">Trames de culte</div>
      </div>
    </div>
  );
}

export function Layout() {
  const { session, signOut } = useSession();
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            {session?.role && (
              <Badge tone="primary" className="hidden sm:inline-flex">
                {ROLE_LABEL[session.role] ?? session.role}
              </Badge>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

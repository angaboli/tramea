import { Outlet, Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Button } from './components/Button';
import { ThemeToggle } from './components/ThemeToggle';
import { useSession } from './stores/session';
import { canCreateProgramme, canCreateTrame, canManageUsers } from '../domain/auth/access';

const ROLE_LABEL: Record<string, string> = {
  basic: 'Basique',
  advanced: 'Avancé',
  admin: 'Admin',
};

function Logo() {
  return (
    <Link to="/creator" className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="3.5" y1="5" x2="14.5" y2="5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3.5" y1="9" x2="11" y2="9" stroke="#FF6C1A" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3.5" y1="13" x2="14.5" y2="13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold tracking-tight">Tramea</div>
        <div className="text-xs text-text-muted">Trames de culte</div>
      </div>
    </Link>
  );
}

const IconHome = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" />
  </svg>
);
const IconDoc = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
  </svg>
);
const IconLayers = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
  </svg>
);
const IconUsers = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </svg>
);

function NavItem({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={[
        'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-primary-soft text-primary-soft-text'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text',
      ].join(' ')}
    >
      {icon}
      {label}
    </Link>
  );
}

function UserBadge({ email, role }: { email: string; role: string | null }) {
  const name = email.split('@')[0] || email;
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-soft-text">
        {initial}
      </span>
      <div className="hidden leading-tight sm:block">
        <div className="truncate text-sm font-semibold capitalize">{name}</div>
        {role && <div className="text-xs text-text-muted">{ROLE_LABEL[role] ?? role}</div>}
      </div>
    </div>
  );
}

export function Layout() {
  const { session, signOut } = useSession();
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
        <div className="mb-6 px-1">
          <Logo />
        </div>
        <NavItem to="/creator" icon={IconHome} label="Tableau de bord" active={pathname === '/creator'} />
        {canCreateProgramme(session) && (
          <NavItem to="/programme" icon={IconDoc} label="Programme" active={pathname === '/programme'} />
        )}
        {canCreateTrame(session) && (
          <NavItem to="/trame" icon={IconLayers} label="Trame" active={pathname === '/trame'} />
        )}
        {canManageUsers(session) && (
          <NavItem to="/admin" icon={IconUsers} label="Utilisateurs" active={pathname === '/admin'} />
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-border bg-surface/60 px-6 py-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Déconnexion
          </Button>
          {session?.email && <UserBadge email={session.email} role={session.role} />}
        </header>
        <Outlet />
      </div>
    </div>
  );
}

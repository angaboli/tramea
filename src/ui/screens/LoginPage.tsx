import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from '../stores/session';
import { isRealAuth } from '../../infrastructure/auth/authPort';
import { authErrorMessage } from '../lib/authErrorMessage';

function Logo() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <line x1="3.5" y1="5" x2="14.5" y2="5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="3.5" y1="9" x2="11" y2="9" stroke="#FF6C1A" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="3.5" y1="13" x2="14.5" y2="13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function LoginPage() {
  const { phase, pendingEmail, sendLink, signInPassword, signUpPassword, completeLogin } = useSession();
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkSent = phase === 'link-sent';

  async function run(action: () => Promise<void>) {
    if (busy) return; // anti double-soumission
    if (!email.trim()) {
      setError('Saisissez votre adresse email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Connexion par mot de passe « intelligente » : on tente la connexion ; si le
  // compte n'existe pas encore, on le crée automatiquement (puis attente admin).
  async function passwordAuth() {
    try {
      await signInPassword(email, password);
    } catch (e1) {
      const m = e1 instanceof Error ? e1.message.toLowerCase() : '';
      if (m.includes('invalid login') || m.includes('credentials')) {
        try {
          await signUpPassword(email, password);
        } catch (e2) {
          const m2 = e2 instanceof Error ? e2.message.toLowerCase() : '';
          if (m2.includes('already registered') || m2.includes('already exists')) {
            throw new Error('Mot de passe incorrect.');
          }
          throw e2;
        }
      } else throw e1;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => (mode === 'password' ? passwordAuth() : sendLink(email)));
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Tramea</h1>
              <p className="text-sm text-text-muted">Trames de culte ProPresenter</p>
            </div>
          </div>

          <Card className="shadow-lg">
            {!linkSent ? (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold">Connexion</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {mode === 'password'
                      ? 'Connexion par mot de passe (immédiate).'
                      : 'Recevez un lien magique par email.'}{' '}
                    L'accès est validé par un administrateur.
                  </p>
                </div>
                <Input
                  label="Adresse email"
                  type="email"
                  required
                  autoFocus
                  placeholder="vous@eglise.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {mode === 'password' && (
                  <Input
                    label="Mot de passe"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
                <Button type="submit" full disabled={busy}>
                  {busy
                    ? 'Connexion…'
                    : mode === 'password'
                      ? 'Se connecter / créer mon compte'
                      : 'Recevoir le lien magique'}
                </Button>
                {mode === 'password' && (
                  <p className="text-center text-xs text-text-muted">
                    Première fois ? Votre compte est créé automatiquement, puis
                    activé par un administrateur.
                  </p>
                )}
                {error && (
                  <p className="rounded-md bg-error-soft px-3 py-2 text-center text-sm font-semibold text-error">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMode((m) => (m === 'password' ? 'magic' : 'password'));
                    setError(null);
                  }}
                  className="text-center text-sm font-semibold text-primary hover:underline"
                >
                  {mode === 'password'
                    ? 'Recevoir un lien magique à la place'
                    : 'Se connecter par mot de passe'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m22 4-10 10.01-3-3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold">Vérifiez votre boîte mail</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Un lien de connexion a été envoyé à{' '}
                    <span className="font-semibold text-text">{pendingEmail}</span>.
                  </p>
                </div>
                {/* Mode dev (auth locale) uniquement : simuler le retour du lien.
                    Masqué dès que Supabase est configuré (vrai lien magique). */}
                {!isRealAuth && (
                  <Button
                    variant="secondary"
                    full
                    onClick={() => pendingEmail && completeLogin(pendingEmail)}
                  >
                    Continuer (démo)
                  </Button>
                )}
              </div>
            )}
          </Card>

          <p className="mt-5 text-center text-xs text-text-muted">
            Aucun compte n'est créé sans l'autorisation d'un administrateur.
          </p>
        </div>
      </main>
    </div>
  );
}

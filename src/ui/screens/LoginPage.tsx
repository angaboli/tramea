import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
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
  const { phase, pendingEmail, signInPassword, signUpPassword, completeLogin } = useSession();
  const [view, setView] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkSent = phase === 'link-sent';

  async function run(action: () => Promise<void>) {
    if (busy) return; // anti double-soumission
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Saisissez votre adresse email.');
      return;
    }
    if (view === 'signin') {
      void run(() => signInPassword(email, password));
      return;
    }
    // Création de compte : mot de passe saisi deux fois.
    if (password.length < 6) {
      setError('Choisissez un mot de passe d’au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    void run(() => signUpPassword(email, password));
  }

  function switchView(next: 'signin' | 'signup') {
    setView(next);
    setError(null);
    setPassword('');
    setConfirm('');
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
                  <h2 className="text-lg font-bold">
                    {view === 'signin' ? 'Connexion' : 'Créer un compte'}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {view === 'signin'
                      ? 'Entrez votre email et votre mot de passe.'
                      : 'Choisissez un mot de passe (saisi deux fois).'}{' '}
                    L'accès est validé par un administrateur.
                  </p>
                </div>

                <Input
                  label="Adresse email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="vous@eglise.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <PasswordInput
                  label="Mot de passe"
                  required
                  autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {view === 'signup' && (
                  <PasswordInput
                    label="Confirmer le mot de passe"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                )}

                <Button type="submit" full disabled={busy}>
                  {busy
                    ? 'Veuillez patienter…'
                    : view === 'signin'
                      ? 'Se connecter'
                      : 'Créer mon compte'}
                </Button>

                {error && (
                  <p className="rounded-md bg-error-soft px-3 py-2 text-center text-sm font-semibold text-error">
                    {error}
                  </p>
                )}

                <p className="text-center text-sm text-text-secondary">
                  {view === 'signin' ? (
                    <>
                      Pas encore de compte ?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('signup')}
                        className="font-semibold text-primary hover:underline"
                      >
                        Créer un compte
                      </button>
                    </>
                  ) : (
                    <>
                      Déjà un compte ?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="font-semibold text-primary hover:underline"
                      >
                        Se connecter
                      </button>
                    </>
                  )}
                </p>
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
                    Un email de confirmation a été envoyé à{' '}
                    <span className="font-semibold text-text">{pendingEmail}</span>.
                    Confirmez-le, puis connectez-vous.
                  </p>
                </div>
                {/* Mode dev (auth locale) uniquement : simuler la confirmation. */}
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
            Aucun compte n'est activé sans l'autorisation d'un administrateur.
          </p>
        </div>
      </main>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from '../stores/session';
import { isRealAuth } from '../../infrastructure/auth/authPort';

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

function mapError(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('rate limit') || msg.includes('429'))
    return 'Trop d’emails envoyés. Réessayez dans quelques minutes, ou connectez-vous par mot de passe.';
  const after = msg.match(/after (\d+) seconds/);
  if (after) return `Patientez ${after[1]} s avant de redemander un lien.`;
  if (msg.includes('invalid login') || msg.includes('credentials'))
    return 'Email ou mot de passe incorrect (ou compte pas encore créé).';
  if (msg.includes('already registered') || msg.includes('already exists'))
    return 'Un compte existe déjà pour cet email — connectez-vous.';
  if (msg.includes('password') && (msg.includes('6') || msg.includes('least') || msg.includes('short')))
    return 'Mot de passe trop court (au moins 6 caractères).';
  if (msg.includes('email not confirmed'))
    return 'Email non confirmé. Confirmez-le via l’email reçu, puis connectez-vous.';
  return 'Échec de la connexion. Vérifiez vos informations et réessayez.';
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
      setError(mapError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => (mode === 'password' ? signInPassword(email, password) : sendLink(email)));
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
                      ? 'Se connecter'
                      : 'Recevoir le lien magique'}
                </Button>
                {mode === 'password' && (
                  <Button
                    type="button"
                    variant="secondary"
                    full
                    disabled={busy}
                    onClick={() => void run(() => signUpPassword(email, password))}
                  >
                    Première fois ? Créer mon compte
                  </Button>
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

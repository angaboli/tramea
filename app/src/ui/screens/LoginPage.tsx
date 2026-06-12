import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSession } from '../stores/session';

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
  const { phase, pendingEmail, sendLink, completeLogin } = useSession();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const linkSent = phase === 'link-sent';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await sendLink(email);
    } finally {
      setBusy(false);
    }
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
                    Recevez un lien magique par email. L'accès est validé par un
                    administrateur.
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
                <Button type="submit" full disabled={busy}>
                  {busy ? 'Envoi…' : 'Recevoir le lien magique'}
                </Button>
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
                {/* Mode dev (auth locale) : simuler le retour du lien magique.
                    Sera retiré avec l'adapter Supabase réel. */}
                <Button
                  variant="secondary"
                  full
                  onClick={() => pendingEmail && completeLogin(pendingEmail)}
                >
                  Continuer (démo)
                </Button>
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

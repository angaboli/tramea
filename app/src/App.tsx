import { useState } from 'react';
import { Button } from './ui/components/Button';
import { Card } from './ui/components/Card';
import { Badge } from './ui/components/Badge';
import { Input } from './ui/components/Input';
import { ThemeToggle } from './ui/components/ThemeToggle';
import { useSession } from './ui/stores/session';
import { countSongs } from './domain/trame/programme';
import type { Programme } from './domain/trame/types';
import { FileSystemAccessAdapter } from './infrastructure/fs/fileSystemAccessAdapter';
import { exportProplaylist } from './application/usecases/exportProplaylist';
import { programmeToExportItems } from './application/usecases/programmeToExportItems';
import { downloadBytes } from './ui/lib/download';

const ROLE_LABEL: Record<string, string> = {
  basic: 'Basique', advanced: 'Avancé', admin: 'Admin',
};

const demo: Programme = {
  id: 'p1',
  date: '2026-06-13',
  titre: 'Église Adventiste – Lille',
  sections: [
    {
      id: 's1',
      label: 'ÉCOLE DU SABBAT',
      items: [
        { id: 'i1', type: 'song', titre: 'Seigneur, mon âme soupire', ref: 'H&L 508', proFile: 'Seigneur, mon âme soupire - H&L 508.pro', tonalite: 'Sol' },
        { id: 'i2', type: 'label', titre: 'Bienvenue', officiant: 'Philippe' },
      ],
    },
    {
      id: 's2',
      label: 'TEMPS DE LOUANGES',
      items: [
        { id: 'i3', type: 'song', titre: 'Agnus Dei', ref: 'JEM 724', proFile: 'Agnus Dei - JEM 724 1.pro' },
        { id: 'i4', type: 'song', titre: 'Chant à compléter', ref: '' },
      ],
    },
  ],
};

export default function App() {
  const { session, signOut } = useSession();
  const fsSupported = FileSystemAccessAdapter.isSupported();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onExport() {
    setBusy(true);
    setStatus(null);
    try {
      const fs = new FileSystemAccessAdapter();
      await fs.pickDirectory();
      const result = await exportProplaylist(
        { playlistName: `sabbat ${demo.date}`, items: programmeToExportItems(demo) },
        fs,
      );
      downloadBytes(result.zip, `${demo.titre} - ${demo.date}.proPlaylist`);
      const miss = result.missingPresentations.length;
      setStatus(
        `Export OK : ${result.proCount} chant(s), ${result.mediaCount} média(s)` +
          (miss ? ` · ${miss} à compléter` : ''),
      );
    } catch (e) {
      setStatus(e instanceof Error ? `Annulé : ${e.message}` : 'Erreur inattendue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
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

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <Badge tone="accent" className="mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> PWA · HORS-LIGNE
        </Badge>
        <h1 className="mb-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          La trame de votre culte, claire et fiable.
        </h1>
        <p className="mb-8 max-w-xl text-lg text-text-secondary">
          Système de design appliqué — fondations (couleurs, thèmes, composants)
          en place. Mobile-first, clair / sombre.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="mb-1 text-lg font-bold">{demo.titre}</h2>
            <p className="mb-4 text-sm text-text-muted">
              {demo.date} · {countSongs(demo)} chant(s)
            </p>
            <div className="flex flex-col gap-2">
              {demo.sections.map((s) => (
                <div key={s.id}>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">
                    {s.label}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {s.items.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                        <span>{i.titre}{i.ref ? ` — ${i.ref}` : ''}</span>
                        {i.type === 'song' &&
                          (i.proFile ? (
                            <Badge tone="success">lié</Badge>
                          ) : (
                            <Badge tone="warning">à compléter</Badge>
                          ))}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold">Composants</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button>Primaire</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="mb-4">
              <Input label="Titre du programme" placeholder="Sabbat 13 juin 2026" />
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone="primary">Brouillon</Badge>
              <Badge tone="success">Validé</Badge>
              <Badge tone="warning">À compléter</Badge>
              <Badge tone="error">Erreur</Badge>
            </div>
            <Button variant="accent" full disabled={busy || !fsSupported} onClick={onExport}>
              {busy ? 'Export…' : 'Choisir le dossier ProPresenter et exporter'}
            </Button>
            {!fsSupported && (
              <p className="mt-2 text-xs text-text-muted">
                Export .proPlaylist disponible sur Chrome / Edge (File System Access).
              </p>
            )}
            {status && (
              <p className="mt-2 text-xs font-semibold text-text-secondary">{status}</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

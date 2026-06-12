import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useSession } from '../stores/session';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { canCreateProgramme, canCreateTrame, canManageUsers } from '../../domain/auth/access';
import { countSongs } from '../../domain/trame/programme';
import type { Programme } from '../../domain/trame/types';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';
import { exportProplaylist } from '../../application/usecases/exportProplaylist';
import { programmeToExportItems } from '../../application/usecases/programmeToExportItems';
import { downloadBytes } from '../lib/download';

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

interface ActionProps {
  title: string;
  desc: string;
  cta: string;
  tone?: 'primary' | 'accent';
  disabled?: boolean;
  onClick?: () => void;
}

function ActionCard({ title, desc, cta, tone = 'primary', disabled, onClick }: ActionProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{desc}</p>
      </div>
      <div className="mt-auto">
        <Button variant={tone} full disabled={disabled} onClick={onClick}>
          {cta}
        </Button>
      </div>
    </Card>
  );
}

export function CreatorDashboard() {
  const { session } = useSession();
  const navigate = useNavigate();
  const resetProgramme = useProgrammeEditor((s) => s.reset);
  const fsSupported = FileSystemAccessAdapter.isSupported();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function newProgramme() {
    resetProgramme();
    navigate('/programme');
  }

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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-8">
        <Badge tone="accent" className="mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> CREATOR
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Bonjour 👋
        </h1>
        <p className="mt-1 text-text-secondary">
          {session?.email} — préparez le programme et la trame de votre prochain culte.
        </p>
      </div>

      {/* Actions selon le rôle */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Nouveau programme"
          desc="Composer l'ordre du culte : sections, chants, moments liturgiques."
          cta="Créer un programme"
          disabled={!canCreateProgramme(session)}
          onClick={newProgramme}
        />
        <ActionCard
          title="Nouvelle trame"
          desc="Transformer un programme en séquence ProPresenter (.proPlaylist)."
          cta="Créer une trame"
          tone="accent"
          disabled={!canCreateTrame(session)}
          onClick={newProgramme}
        />
        {canManageUsers(session) && (
          <ActionCard
            title="Utilisateurs"
            desc="Approuver les nouveaux comptes et attribuer les rôles."
            cta="Gérer les utilisateurs"
            disabled
          />
        )}
      </div>

      {/* Aperçu programme + export (démo) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{demo.titre}</h2>
            <Badge tone="neutral">Brouillon</Badge>
          </div>
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
                      <span>
                        {i.titre}
                        {i.ref ? ` — ${i.ref}` : ''}
                      </span>
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

        <Card className="flex flex-col">
          <h2 className="mb-1 text-lg font-bold">Export ProPresenter</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Génère un fichier <span className="font-mono text-[13px]">.proPlaylist</span>{' '}
            importable directement, médias inclus.
          </p>
          <div className="mt-auto">
            <Button
              variant="accent"
              full
              disabled={busy || !fsSupported || !canCreateTrame(session)}
              onClick={onExport}
            >
              {busy ? 'Export…' : 'Choisir le dossier et exporter'}
            </Button>
            {!canCreateTrame(session) && (
              <p className="mt-2 text-xs text-text-muted">
                Rôle « avancé » requis pour créer une trame.
              </p>
            )}
            {!fsSupported && (
              <p className="mt-2 text-xs text-text-muted">
                Export disponible sur Chrome / Edge (File System Access).
              </p>
            )}
            {status && (
              <p className="mt-2 text-xs font-semibold text-text-secondary">{status}</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readProgramFile } from '../../infrastructure/import/readProgramFile';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { NewTrameDialog } from '../components/NewTrameDialog';
import { TechBadges } from '../components/TechBadges';
import { useSession } from '../stores/session';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSavedProgrammes } from '../stores/savedProgrammes';
import { countSongs } from '../../domain/trame/programme';
import { duplicateProgramme } from '../../domain/trame/duplicate';
import type { Programme } from '../../domain/trame/types';
import { canCreateProgramme, canCreateTrame, canManageUsers } from '../../domain/auth/access';

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
  const loadProgramme = useProgrammeEditor((s) => s.load);
  const saved = useSavedProgrammes();
  const [status, setStatus] = useState<string | null>(null);
  const [trameDialog, setTrameDialog] = useState(false);

  function newProgramme() {
    resetProgramme();
    navigate('/programme');
  }
  function openProgramme(p: Programme) {
    loadProgramme(p);
    navigate('/programme');
  }

  function duplicate(p: Programme) {
    const today = new Date().toISOString().slice(0, 10);
    loadProgramme(duplicateProgramme(p, today));
    navigate('/programme');
  }

  const fileInput = useRef<HTMLInputElement>(null);
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const programme = await readProgramFile(file);
      loadProgramme(programme);
      navigate('/programme');
    } catch {
      setStatus("Échec de l'import du fichier.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {trameDialog && <NewTrameDialog onClose={() => setTrameDialog(false)} />}
      <div className="mb-8">
        <Badge tone="accent" className="mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> CREATOR
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bonjour 👋</h1>
        <p className="mt-1 text-text-secondary">
          {session?.email} — préparez le programme et la trame de votre prochain culte.
        </p>
        {status && <p className="mt-2 text-sm font-semibold text-error">{status}</p>}
      </div>

      {/* Actions selon le rôle */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Nouveau programme"
          desc="Composer l'ordre du culte : sections, chants, moments. Export PDF."
          cta="Créer un programme"
          disabled={!canCreateProgramme(session)}
          onClick={newProgramme}
        />
        <ActionCard
          title="Nouvelle trame"
          desc="Construire la séquence ProPresenter. Export .proPlaylist."
          cta="Créer une trame"
          tone="accent"
          disabled={!canCreateTrame(session)}
          onClick={() => setTrameDialog(true)}
        />
        <ActionCard
          title="Importer (PDF / MD)"
          desc="Partir d'un programme existant : PDF ou Markdown, mappé automatiquement."
          cta="Importer un fichier"
          disabled={!canCreateProgramme(session)}
          onClick={() => fileInput.current?.click()}
        />
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
          className="hidden"
          onChange={onImportFile}
        />
        {canManageUsers(session) && (
          <ActionCard
            title="Utilisateurs"
            desc="Approuver les nouveaux comptes et attribuer les rôles."
            cta="Gérer les utilisateurs"
            onClick={() => navigate('/admin')}
          />
        )}
      </div>

      {/* Mes programmes (sauvegardés localement) */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Mes programmes</h2>
          <Badge tone="neutral">{saved.items.length}</Badge>
        </div>
        {saved.items.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            Aucun programme enregistré. Créez-en un — il sera sauvegardé automatiquement.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {saved.items.map((rec) => (
              <li key={rec.programme.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => openProgramme(rec.programme)}
                  className="flex-1 truncate text-left hover:text-primary focus-visible:outline-none"
                >
                  <span className="font-semibold">{rec.programme.titre || 'Sans titre'}</span>
                  <span className="ml-2 text-sm text-text-muted">
                    {rec.programme.date} · {countSongs(rec.programme)} chant(s)
                  </span>
                </button>
                <Button variant="secondary" size="sm" onClick={() => duplicate(rec.programme)}>
                  Dupliquer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => saved.remove(rec.programme.id)}>
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TechBadges className="mt-8" />
    </main>
  );
}

import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { readProgramFile } from '../../infrastructure/import/readProgramFile';
import { Badge } from '../components/Badge';
import { NewTrameDialog } from '../components/NewTrameDialog';
import { useSession } from '../stores/session';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSavedProgrammes } from '../stores/savedProgrammes';
import { countSongs } from '../../domain/trame/programme';
import { duplicateProgramme } from '../../domain/trame/duplicate';
import { formatFrDate } from '../../domain/trame/formatDate';
import type { Programme } from '../../domain/trame/types';
import { canCreateProgramme, canCreateTrame, canManageUsers } from '../../domain/auth/access';

/* ── Icônes (inline, héritent currentColor) ─────────────────────────────── */
const IconDoc = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M8 12h8M8 16h6" />
  </svg>
);
const IconLayers = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 3 8l9 5 9-5-9-5z" />
    <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
  </svg>
);
const IconImport = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);
const IconUsers = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </svg>
);
const IconArrow = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

type Tone = 'primary' | 'accent' | 'neutral' | 'success';
const toneClasses: Record<Tone, { tile: string; medallion: string; cta: string }> = {
  primary: { tile: 'hover:border-primary/40', medallion: 'bg-primary-soft text-primary-soft-text', cta: 'text-primary' },
  accent: { tile: 'hover:border-accent/40', medallion: 'bg-accent-soft text-accent-soft-text', cta: 'text-accent' },
  neutral: { tile: 'hover:border-border-strong', medallion: 'bg-surface-2 text-text-secondary', cta: 'text-text-secondary' },
  success: { tile: 'hover:border-success/40', medallion: 'bg-success-soft text-success', cta: 'text-success' },
};

function ActionTile({
  icon, title, desc, cta, tone, onClick, delay,
}: {
  icon: ReactNode; title: string; desc: string; cta: string; tone: Tone; onClick: () => void; delay: number;
}) {
  const t = toneClasses[tone];
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={[
        'fade-up group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left',
        'shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:shadow-focus focus-visible:outline-none',
        t.tile,
      ].join(' ')}
    >
      <span className={['flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105', t.medallion].join(' ')}>
        {icon}
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-snug text-text-secondary">{desc}</p>
      </div>
      <span className={['mt-auto inline-flex items-center gap-1.5 text-sm font-semibold', t.cta].join(' ')}>
        {cta}
        <span className="transition-transform duration-200 group-hover:translate-x-1">{IconArrow}</span>
      </span>
    </button>
  );
}

const ROLE_LABEL: Record<string, string> = { basic: 'Basique', advanced: 'Avancé', admin: 'Admin' };

function frToday(): string {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

export function CreatorDashboard() {
  const { session } = useSession();
  const navigate = useNavigate();
  const resetProgramme = useProgrammeEditor((s) => s.reset);
  const loadProgramme = useProgrammeEditor((s) => s.load);
  const saved = useSavedProgrammes();
  const [status, setStatus] = useState<string | null>(null);
  const [trameDialog, setTrameDialog] = useState(false);
  const [query, setQuery] = useState('');

  function newProgramme() {
    resetProgramme();
    navigate('/programme');
  }
  function routeFor(p: Programme) {
    return p.kind === 'trame' ? '/trame' : '/programme';
  }
  function openProgramme(p: Programme) {
    loadProgramme(p);
    navigate(routeFor(p));
  }
  function duplicate(p: Programme) {
    const today = new Date().toISOString().slice(0, 10);
    loadProgramme(duplicateProgramme(p, today));
    navigate(routeFor(p));
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

  const firstName = session?.email?.split('@')[0] ?? '';
  const items = saved.items.filter((r) =>
    (r.programme.titre || 'Sans titre').toLowerCase().includes(query.trim().toLowerCase()),
  );

  let tileDelay = 0;
  const nextDelay = () => (tileDelay += 70);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {trameDialog && <NewTrameDialog onClose={() => setTrameDialog(false)} />}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="fade-up relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-active px-6 py-8 text-text-inverse shadow-lg sm:px-10 sm:py-10">
        {/* portée musicale décorative */}
        <svg className="pointer-events-none absolute -right-6 top-0 h-full w-72 opacity-[0.13]" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          {[30, 60, 90, 120, 150].map((y) => (
            <line key={y} x1="0" y1={y} x2="200" y2={y - 24} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          ))}
          <circle cx="58" cy="92" r="9" fill="#FF6C1A" />
          <circle cx="150" cy="64" r="9" fill="#fff" />
        </svg>

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Église Adventiste · Lille
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
          Bonjour{firstName ? <>, <span className="capitalize">{firstName}</span></> : ''}.
        </h1>
        <p className="mt-2 max-w-md text-sm text-white/80">
          Préparez le programme et la trame de votre prochain culte.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/50" /> {frToday()}
          </span>
          {session?.role && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" /> Rôle {ROLE_LABEL[session.role] ?? session.role}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/50" /> {saved.items.length} document(s)
          </span>
        </div>
      </section>

      {status && (
        <p className="mb-4 rounded-lg bg-error-soft px-3 py-2 text-sm font-semibold text-error">{status}</p>
      )}

      {/* ── Actions (grille SANS carte orpheline) ─────────────────────────── */}
      {(() => {
        const actions: Omit<Parameters<typeof ActionTile>[0], 'delay'>[] = [];
        if (canCreateProgramme(session))
          actions.push({ icon: IconDoc, tone: 'primary', title: 'Nouveau programme',
            desc: "Composer l'ordre du culte : sections, chants, moments. Export PDF.",
            cta: 'Créer un programme', onClick: newProgramme });
        if (canCreateTrame(session))
          actions.push({ icon: IconLayers, tone: 'accent', title: 'Nouvelle trame',
            desc: 'Construire la séquence ProPresenter. Export .proPlaylist.',
            cta: 'Créer une trame', onClick: () => setTrameDialog(true) });
        if (canCreateProgramme(session))
          actions.push({ icon: IconImport, tone: 'neutral', title: 'Importer (PDF / MD)',
            desc: "Partir d'un programme existant : PDF ou Markdown, mappé automatiquement.",
            cta: 'Importer un fichier', onClick: () => fileInput.current?.click() });
        if (canManageUsers(session))
          actions.push({ icon: IconUsers, tone: 'success', title: 'Utilisateurs',
            desc: 'Approuver les nouveaux comptes et attribuer les rôles.',
            cta: 'Gérer les utilisateurs', onClick: () => navigate('/admin') });

        // 2 → 1 ligne de 2 ; 3 → 1 ligne de 3 ; 4 → 2×2 (jamais d'orpheline).
        const cols = actions.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
        return (
          <div className={['mb-10 grid gap-4', cols].join(' ')}>
            {actions.map((a) => (
              <ActionTile key={a.title} {...a} delay={nextDelay()} />
            ))}
          </div>
        );
      })()}
      <input ref={fileInput} type="file" className="hidden"
        accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain" onChange={onImportFile} />

      {/* ── Bibliothèque ──────────────────────────────────────────────────── */}
      <section className="fade-up" style={{ animationDelay: `${nextDelay()}ms` }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">Mes programmes et trames</h2>
          {saved.items.length > 4 && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="min-h-[40px] w-full max-w-xs rounded-lg border border-border-strong bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus-visible:border-primary focus-visible:shadow-focus focus-visible:outline-none"
            />
          )}
        </div>

        {saved.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-surface-2 px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-text-muted shadow-sm">
              {IconDoc}
            </div>
            <p className="font-display text-lg font-semibold">Rien d'enregistré pour l'instant</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">
              Créez un programme — il sera sauvegardé automatiquement et apparaîtra ici.
            </p>
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-4 py-10 text-center text-sm text-text-muted">
            Aucun résultat pour « {query} ».
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {items.map((rec, i) => {
              const p = rec.programme;
              const isTrame = p.kind === 'trame';
              return (
                <li
                  key={p.id}
                  className="group flex items-center gap-3 border-b border-border px-3 py-3 transition-colors last:border-0 hover:bg-surface-2 sm:px-4"
                >
                  <span
                    className={[
                      'hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex',
                      isTrame ? 'bg-accent-soft text-accent-soft-text' : 'bg-primary-soft text-primary-soft-text',
                    ].join(' ')}
                  >
                    {isTrame ? IconLayers : IconDoc}
                  </span>
                  <button onClick={() => openProgramme(p)} className="min-w-0 flex-1 text-left focus-visible:outline-none">
                    <div className="flex items-center gap-2">
                      <Badge tone={isTrame ? 'accent' : 'primary'}>{isTrame ? 'Trame' : 'Programme'}</Badge>
                      <span className="truncate font-display text-[15px] font-semibold group-hover:text-primary">
                        {p.titre || 'Sans titre'}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-text-muted">
                      {formatFrDate(p.date)} · {countSongs(p)} chant(s) · {p.sections.length} section(s)
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <RowAction label="Dupliquer" onClick={() => duplicate(p)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
                      </svg>
                    </RowAction>
                    <RowAction label="Supprimer" danger onClick={() => saved.remove(p.id)}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                      </svg>
                    </RowAction>
                  </div>
                  {/* index utilisé pour un léger stagger d'opacité au survol */}
                  <span className="sr-only">{i}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function RowAction({
  label, onClick, children, danger,
}: {
  label: string; onClick: () => void; children: ReactNode; danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors',
        'hover:bg-surface focus-visible:shadow-focus focus-visible:outline-none',
        'sm:opacity-0 sm:group-hover:opacity-100',
        danger ? 'hover:text-error' : 'hover:text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

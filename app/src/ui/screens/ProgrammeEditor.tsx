import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSession } from '../stores/session';
import { canCreateTrame } from '../../domain/auth/access';
import { countSongs, missingProFiles } from '../../domain/trame/programme';
import type { Section, TrameItem } from '../../domain/trame/types';
import { FileSystemAccessAdapter } from '../../infrastructure/fs/fileSystemAccessAdapter';
import { exportProplaylist } from '../../application/usecases/exportProplaylist';
import { programmeToExportItems } from '../../application/usecases/programmeToExportItems';
import { downloadBytes } from '../lib/download';

const SECTION_PRESETS = [
  'ÉCOLE DU SABBAT',
  "CULTE D'ADORATION",
  'TEMPS DE LOUANGES',
  'ANNONCES',
  'INTERCESSION',
  'PRÉLUDE',
  'POSTLUDE',
];

const field =
  'min-h-[40px] w-full rounded-md border border-border bg-surface px-3 text-sm text-text ' +
  'placeholder:text-text-muted focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary';

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text-secondary hover:bg-surface-hover disabled:opacity-40 focus-visible:shadow-focus focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function ItemRow({
  sectionId,
  item,
  index,
  count,
}: {
  sectionId: string;
  item: TrameItem;
  index: number;
  count: number;
}) {
  const { updateItem, removeItem, moveItem } = useProgrammeEditor();
  const isSong = item.type === 'song';
  return (
    <div className="rounded-md border border-border bg-surface-2 p-2.5">
      <div className="flex items-center gap-2">
        <button
          aria-label={isSong ? 'Basculer en libellé' : 'Basculer en chant'}
          title={isSong ? 'Chant' : 'Libellé'}
          onClick={() => updateItem(sectionId, item.id, { type: isSong ? 'label' : 'song' })}
          className="shrink-0"
        >
          <Badge tone={isSong ? 'primary' : 'neutral'}>{isSong ? 'Chant' : 'Texte'}</Badge>
        </button>
        <input
          className={field}
          placeholder={isSong ? 'Titre du chant' : 'Moment liturgique (ex : Bienvenue)'}
          value={item.titre}
          onChange={(e) => updateItem(sectionId, item.id, { titre: e.target.value })}
        />
        <div className="flex shrink-0 gap-1">
          <IconBtn label="Monter" onClick={() => moveItem(sectionId, index, index - 1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn label="Descendre" onClick={() => moveItem(sectionId, index, index + 1)} disabled={index === count - 1}>↓</IconBtn>
          <IconBtn label="Supprimer" onClick={() => removeItem(sectionId, item.id)}>✕</IconBtn>
        </div>
      </div>
      {isSong && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className={field} placeholder="Réf (H&L 508)" value={item.ref ?? ''} onChange={(e) => updateItem(sectionId, item.id, { ref: e.target.value })} />
          <input className={field} placeholder="Tonalité" value={item.tonalite ?? ''} onChange={(e) => updateItem(sectionId, item.id, { tonalite: e.target.value })} />
          <input className={field} placeholder="Officiant" value={item.officiant ?? ''} onChange={(e) => updateItem(sectionId, item.id, { officiant: e.target.value })} />
          <input className={field} placeholder="Fichier .pro" value={item.proFile ?? ''} onChange={(e) => updateItem(sectionId, item.id, { proFile: e.target.value })} />
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, index, count }: { section: Section; index: number; count: number }) {
  const { renameSection, removeSection, moveSection, addItem } = useProgrammeEditor();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className={field + ' font-bold uppercase tracking-wide'}
          value={section.label}
          onChange={(e) => renameSection(section.id, e.target.value)}
        />
        <div className="flex shrink-0 gap-1">
          <IconBtn label="Monter la section" onClick={() => moveSection(index, index - 1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn label="Descendre la section" onClick={() => moveSection(index, index + 1)} disabled={index === count - 1}>↓</IconBtn>
          <IconBtn label="Supprimer la section" onClick={() => removeSection(section.id)}>✕</IconBtn>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {section.items.map((it, i) => (
          <ItemRow key={it.id} sectionId={section.id} item={it} index={i} count={section.items.length} />
        ))}
        {section.items.length === 0 && (
          <p className="py-2 text-center text-sm text-text-muted">Section vide.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => addItem(section.id, 'song', '')}>+ Chant</Button>
        <Button variant="ghost" size="sm" onClick={() => addItem(section.id, 'label', '')}>+ Texte</Button>
      </div>
    </Card>
  );
}

export function ProgrammeEditor() {
  const { programme, setMeta, addSection } = useProgrammeEditor();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fsSupported = FileSystemAccessAdapter.isSupported();
  const missing = missingProFiles(programme).length;

  async function onExport() {
    setBusy(true);
    setStatus(null);
    try {
      const fs = new FileSystemAccessAdapter();
      await fs.pickDirectory();
      const result = await exportProplaylist(
        { playlistName: `sabbat ${programme.date}`, items: programmeToExportItems(programme) },
        fs,
      );
      const name = (programme.titre || 'trame').replace(/[\\/:*?"<>|]/g, '-');
      downloadBytes(result.zip, `${name} - ${programme.date}.proPlaylist`);
      setStatus(`Export OK : ${result.proCount} chant(s), ${result.mediaCount} média(s)`);
    } catch (e) {
      setStatus(e instanceof Error ? `Annulé : ${e.message}` : 'Erreur inattendue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link to="/creator" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text">
        ← Tableau de bord
      </Link>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Éditeur de programme</h1>
      <p className="mb-6 text-sm text-text-secondary">
        {programme.sections.length} section(s) · {countSongs(programme)} chant(s)
        {missing > 0 && <> · <span className="text-warning">{missing} sans .pro</span></>}
      </p>

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Titre</span>
            <input className={field} placeholder="Église Adventiste – Lille" value={programme.titre} onChange={(e) => setMeta({ titre: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Date</span>
            <input type="date" className={field} value={programme.date} onChange={(e) => setMeta({ date: e.target.value })} />
          </label>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {programme.sections.map((s, i) => (
          <SectionCard key={s.id} section={s} index={i} count={programme.sections.length} />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ajouter une section</div>
        <div className="flex flex-wrap gap-2">
          {SECTION_PRESETS.map((label) => (
            <Button key={label} variant="secondary" size="sm" onClick={() => addSection(label)}>+ {label}</Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => addSection('NOUVELLE SECTION')}>+ Personnalisée</Button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 border-t border-border bg-bg/85 py-4 backdrop-blur">
        <Button
          variant="accent"
          full
          disabled={busy || !fsSupported || !canCreateTrame(session) || countSongs(programme) === 0}
          onClick={onExport}
        >
          {busy ? 'Export…' : 'Exporter en .proPlaylist'}
        </Button>
        {!canCreateTrame(session) && (
          <p className="mt-2 text-center text-xs text-text-muted">Rôle « avancé » requis pour exporter une trame.</p>
        )}
        {status && <p className="mt-2 text-center text-xs font-semibold text-text-secondary">{status}</p>}
      </div>
    </main>
  );
}

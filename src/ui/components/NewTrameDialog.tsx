import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Badge } from './Badge';
import { useSavedProgrammes } from '../stores/savedProgrammes';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { searchProgrammes } from '../../domain/trame/searchProgrammes';
import { formatFrDate } from '../../domain/trame/formatDate';
import { readProgramFile } from '../../infrastructure/import/readProgramFile';
import type { Programme } from '../../domain/trame/types';

/**
 * Création d'une trame : soit on importe un programme (PDF/MD), soit on choisit
 * un programme déjà créé dans Tramea (sélecteur avec recherche). Le programme le
 * plus récent est présélectionné. L'option « partir de zéro » reste possible.
 */
export function NewTrameDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const saved = useSavedProgrammes();
  const { load, reset } = useProgrammeEditor();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const programmes = useMemo(() => saved.items.map((r) => r.programme), [saved.items]);
  const results = useMemo(() => searchProgrammes(programmes, query), [programmes, query]);

  // Présélectionne le programme le plus récent (premier de la liste triée).
  useEffect(() => {
    void saved.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (selectedId === null && programmes.length) setSelectedId(programmes[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programmes.length]);

  // Crée une trame à partir d'un programme : nouvel enregistrement (id propre,
  // kind 'trame') pour ne pas écraser le programme source et pouvoir la rouvrir.
  function useProgramme(p: Programme) {
    load({ ...p, id: crypto.randomUUID(), kind: 'trame' });
    navigate('/trame');
  }

  function confirm() {
    const chosen = programmes.find((p) => p.id === selectedId);
    if (chosen) useProgramme(chosen);
  }

  function fromScratch() {
    reset(undefined, undefined, 'trame');
    navigate('/trame');
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      useProgramme(await readProgramFile(file));
    } catch {
      setError("Échec de l'import du fichier.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold">Créer une trame</h2>
            <button aria-label="Fermer" onClick={onClose} className="text-text-muted hover:text-text">✕</button>
          </div>
          <p className="text-sm text-text-secondary">À partir d'un programme existant ou importé.</p>
        </div>

        <div className="border-b border-border p-4">
          <button
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-hover"
          >
            ⬆ Importer un programme (PDF / Markdown)
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
            className="hidden"
            onChange={onImport}
          />
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>

        <div className="border-b border-border px-4 py-3">
          <input
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-muted focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary"
            placeholder="Rechercher un programme…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-6 text-center text-sm text-text-muted">
              {programmes.length === 0 ? 'Aucun programme enregistré.' : 'Aucun programme ne correspond.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      onDoubleClick={() => useProgramme(p)}
                      className={[
                        'flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none',
                        active ? 'bg-primary-soft' : 'hover:bg-surface-hover',
                      ].join(' ')}
                    >
                      <span className="truncate text-sm font-medium">{p.titre || 'Sans titre'}</span>
                      <Badge tone={active ? 'primary' : 'neutral'}>{formatFrDate(p.date)}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <button onClick={fromScratch} className="text-sm font-semibold text-text-muted hover:text-text">
            Partir de zéro
          </button>
          <Button onClick={confirm} disabled={!selectedId}>
            Créer la trame
          </Button>
        </div>
      </div>
    </div>
  );
}

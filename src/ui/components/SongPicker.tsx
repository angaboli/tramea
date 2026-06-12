import { useMemo, useState } from 'react';
import { Badge } from './Badge';
import { useLibrary } from '../stores/library';
import { parseSongFileName, searchSongs, type LibrarySong } from '../../domain/library/song';

export interface SongChoice {
  titre: string;
  ref: string;
  proFile: string;
}

interface Props {
  onPick: (choice: SongChoice) => void;
  onClose: () => void;
}

export function SongPicker({ onPick, onClose }: Props) {
  const { songs } = useLibrary();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchSongs(songs, query, 40), [songs, query]);

  function choose(s: LibrarySong) {
    const { titre, ref } = parseSongFileName(s.name);
    onPick({ titre, ref, proFile: s.name });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold">Choisir un chant</h2>
            <button aria-label="Fermer" onClick={onClose} className="text-text-muted hover:text-text">✕</button>
          </div>
          <input
            autoFocus
            className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-muted focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary"
            placeholder="Rechercher (titre ou référence)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-6 text-center text-sm text-text-muted">
              {songs.length === 0
                ? 'Aucun dossier connecté.'
                : 'Aucun chant ne correspond.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((s) => {
                const { titre, ref } = parseSongFileName(s.name);
                return (
                  <li key={s.relPath}>
                    <button
                      onClick={() => choose(s)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                    >
                      <span className="truncate text-sm font-medium">{titre}</span>
                      {ref && <Badge tone="neutral">{ref}</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-xs text-text-muted">
          {songs.length} chant(s) dans la bibliothèque
        </div>
      </div>
    </div>
  );
}

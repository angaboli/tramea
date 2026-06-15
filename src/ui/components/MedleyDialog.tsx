import { useState } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { SongPicker } from './SongPicker';

export interface MedleyValue {
  titre: string;
  baseProFile: string;
  slides: string[];
}

/**
 * Création d'un chant depuis l'app : titre, chant modèle (pour une structure
 * ProPresenter valide) et strophes (une par bloc séparé d'une ligne vide). À
 * l'export, le .pro modèle est cloné et son texte remplacé. C'est aussi ainsi
 * qu'on fabrique un medley (mêmes mécanismes, pas de cas particulier).
 */
export function MedleyDialog({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<MedleyValue>;
  onSave: (v: MedleyValue) => void;
  onClose: () => void;
}) {
  const [titre, setTitre] = useState(initial?.titre ?? '');
  const [baseProFile, setBase] = useState(initial?.baseProFile ?? '');
  const [text, setText] = useState((initial?.slides ?? []).join('\n\n'));
  const [picking, setPicking] = useState(false);

  const slides = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  function save() {
    if (!titre.trim() || !baseProFile) return;
    onSave({ titre: titre.trim(), baseProFile, slides });
    onClose();
  }

  const field =
    'min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 text-[15px] ' +
    'text-text placeholder:text-text-muted focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      {picking && (
        <SongPicker
          onClose={() => setPicking(false)}
          onPick={(c) => {
            setBase(c.proFile);
            if (!titre) setTitre('Nouveau chant');
          }}
        />
      )}
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-bold">Créer un chant</h2>
          <button aria-label="Fermer" onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Titre du chant</span>
            <input className={field} placeholder="Mon chant (ou medley)" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Chant modèle (mise en forme & fond)</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>Choisir…</Button>
              {baseProFile ? <Badge tone="success">{baseProFile}</Badge> : <span className="text-xs text-text-muted">Aucun</span>}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Strophes — une par bloc (séparés par une ligne vide)
            </span>
            <textarea
              className={field + ' min-h-[200px] py-2'}
              placeholder={'Strophe 1\nligne 2\n\nRefrain\nligne 2'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="text-xs text-text-muted">{slides.length} diapo(s) — limité au nombre de diapos du chant de base.</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={!titre.trim() || !baseProFile}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}

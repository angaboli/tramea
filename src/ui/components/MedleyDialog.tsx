import { useState } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { SongPicker } from './SongPicker';
import { fetchVerseText } from '../../infrastructure/bible/fetchVerseText';

export interface MedleyValue {
  titre: string;
  baseProFile: string;
  slides: string[];
}

/**
 * Création d'un chant (ou d'une diapo personnalisée) depuis l'app : titre,
 * présentation modèle (pour une structure ProPresenter valide) et texte (une
 * diapo par bloc séparé d'une ligne vide). À l'export, le .pro modèle est
 * cloné et son texte remplacé. C'est aussi ainsi qu'on fabrique un medley ou
 * un verset biblique (mêmes mécanismes, pas de cas particulier) : le bouton
 * « Insérer un verset biblique » récupère le vrai texte (Louis Segond 1910,
 * domaine public) et le place dans les diapos ci-dessous.
 */
export function MedleyDialog({
  initial,
  onSave,
  onClose,
  fixedBaseProFile,
}: {
  initial?: Partial<MedleyValue>;
  onSave: (v: MedleyValue) => void;
  onClose: () => void;
  /**
   * Modèle imposé (ex. pour un Texte personnalisé) : plus de choix à faire,
   * le sélecteur « Présentation modèle » est masqué. Utilisé si l'item n'a pas
   * déjà un modèle enregistré (édition d'un item existant → on garde le sien).
   */
  fixedBaseProFile?: string;
}) {
  const [titre, setTitre] = useState(initial?.titre ?? '');
  const [baseProFile, setBase] = useState(initial?.baseProFile ?? fixedBaseProFile ?? '');
  const [text, setText] = useState((initial?.slides ?? []).join('\n\n'));
  const [picking, setPicking] = useState(false);
  const [verseRef, setVerseRef] = useState('');
  const [verseBusy, setVerseBusy] = useState(false);
  const [verseError, setVerseError] = useState<string | null>(null);

  const slides = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  function save() {
    if (!titre.trim() || !baseProFile) return;
    onSave({ titre: titre.trim(), baseProFile, slides });
    onClose();
  }

  async function insertVerse() {
    if (!verseRef.trim() || verseBusy) return;
    setVerseBusy(true);
    setVerseError(null);
    try {
      const { text: verseText, reference } = await fetchVerseText(verseRef.trim());
      setText((t) => (t.trim() ? `${t.trim()}\n\n${verseText}` : verseText));
      if (!titre.trim()) setTitre(reference || verseRef.trim());
    } catch (e) {
      setVerseError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setVerseBusy(false);
    }
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
          <h2 className="text-base font-bold">Texte personnalisé</h2>
          <button aria-label="Fermer" onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Titre</span>
            <input className={field} placeholder="Mon chant, mon verset…" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </label>

          {/* Texte personnalisé : modèle fixe, pas de choix (le « fond » ne
              fonctionnait pas bien et n'apportait pas grand-chose ici). */}
          {!fixedBaseProFile && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-text-secondary">Présentation modèle (mise en forme & fond)</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>Choisir…</Button>
                {baseProFile ? <Badge tone="success">{baseProFile}</Badge> : <span className="text-xs text-text-muted">Aucune</span>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-2 p-3">
            <span className="text-sm font-semibold text-text-secondary">
              Insérer un verset biblique (optionnel)
            </span>
            <div className="flex items-center gap-2">
              <input
                className={field}
                placeholder="Jean 3:16 ou Psaume 23:1-4"
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void insertVerse();
                  }
                }}
              />
              <Button variant="secondary" size="sm" disabled={!verseRef.trim() || verseBusy} onClick={insertVerse}>
                {verseBusy ? '…' : 'Récupérer'}
              </Button>
            </div>
            <span className="text-xs text-text-muted">
              Texte réel (Louis Segond 1910, domaine public) inséré ci-dessous, dans une nouvelle diapo.
            </span>
            {verseError && <p className="text-xs font-semibold text-error">{verseError}</p>}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Diapos — une par bloc (séparés par une ligne vide)
            </span>
            <textarea
              className={field + ' min-h-[200px] py-2'}
              placeholder={'Strophe 1\nligne 2\n\nRefrain\nligne 2'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="text-xs text-text-muted">{slides.length} diapo(s) — limité au nombre de diapos de la présentation modèle.</span>
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

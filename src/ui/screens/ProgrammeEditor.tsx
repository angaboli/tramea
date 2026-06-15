import { useState, useRef, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useProgrammeEditor } from '../stores/programmeEditor';
import { useSession } from '../stores/session';
import { useLibrary, supportsFolder, supportsPersistentFolder } from '../stores/library';
import { SongPicker } from '../components/SongPicker';
import { MedleyDialog } from '../components/MedleyDialog';
import { canCreateTrame } from '../../domain/auth/access';
import { countSongs, missingProFiles } from '../../domain/trame/programme';
import { RECURRING_LABELS } from '../../domain/trame/recurring';
import type { Section, TrameItem } from '../../domain/trame/types';
import { exportProplaylist } from '../../application/usecases/exportProplaylist';
import { programmeToExportItems } from '../../application/usecases/programmeToExportItems';
import { downloadBytes } from '../lib/download';

// Trame : liste complète (séquence technique variée).
const SECTION_PRESETS = [
  'ÉCOLE DU SABBAT',
  "CULTE D'ADORATION",
  'TEMPS DE LOUANGES',
  'ANNONCES',
  'INTERCESSION',
  'PRÉLUDE',
  'POSTLUDE',
];

// Programme : en pratique seulement 2 sections récurrentes.
const PROGRAMME_PRESETS = ['ÉCOLE DU SABBAT', "CULTE D'ADORATION"];

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
  isTrame,
}: {
  sectionId: string;
  item: TrameItem;
  index: number;
  count: number;
  isTrame: boolean;
}) {
  const { updateItem, removeItem, moveItem } = useProgrammeEditor();
  const libraryReady = useLibrary((s) => s.ready);
  const [picking, setPicking] = useState(false);
  const [medley, setMedley] = useState(false);
  const isSong = item.type === 'song';
  return (
    <div className="rounded-md border border-border bg-surface-2 p-2.5">
      {picking && (
        <SongPicker
          onClose={() => setPicking(false)}
          onPick={(c) =>
            // Chant : on remplit titre + réf. Texte/moment : on garde le libellé,
            // on ne fait que LIER le fichier .pro de la bibliothèque.
            updateItem(
              sectionId,
              item.id,
              isSong ? { titre: c.titre, ref: c.ref, proFile: c.proFile } : { proFile: c.proFile },
            )
          }
        />
      )}
      {medley && (
        <MedleyDialog
          initial={
            item.customSong
              ? { titre: item.titre, baseProFile: item.customSong.baseProFile, slides: item.customSong.slides }
              : { titre: item.titre }
          }
          onClose={() => setMedley(false)}
          onSave={(v) =>
            updateItem(sectionId, item.id, {
              titre: v.titre,
              customSong: { baseProFile: v.baseProFile, slides: v.slides },
            })
          }
        />
      )}
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
        <div className="flex shrink-0 items-center gap-1">
          {/* Couleur du titre (optionnelle) : répercutée sur le PDF. */}
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface" title="Couleur du titre">
            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: item.color || '#1a1f29' }} />
            <input
              type="color"
              aria-label="Couleur du titre"
              value={item.color || '#1a1f29'}
              onChange={(e) => updateItem(sectionId, item.id, { color: e.target.value })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
          {item.color && (
            <IconBtn label="Couleur par défaut" onClick={() => updateItem(sectionId, item.id, { color: undefined })}>⟲</IconBtn>
          )}
          {/* Outils techniques (.pro) : réservés à l'éditeur de TRAME. */}
          {isTrame && libraryReady && (
            <IconBtn label="Lier à la bibliothèque" onClick={() => setPicking(true)}>📚</IconBtn>
          )}
          {isTrame && isSong && libraryReady && (
            <button
              type="button"
              title="Chant personnalisé / medley"
              onClick={() => setMedley(true)}
              className="flex h-9 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
            >
              Medley
            </button>
          )}
          <IconBtn label="Monter" onClick={() => moveItem(sectionId, index, index - 1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn label="Descendre" onClick={() => moveItem(sectionId, index, index + 1)} disabled={index === count - 1}>↓</IconBtn>
          <IconBtn label="Supprimer" onClick={() => removeItem(sectionId, item.id)}>✕</IconBtn>
        </div>
      </div>
      {isSong ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input className={field} placeholder="Réf (H&L 508)" value={item.ref ?? ''} onChange={(e) => updateItem(sectionId, item.id, { ref: e.target.value })} />
            <input className={field} placeholder="Tonalité" value={item.tonalite ?? ''} onChange={(e) => updateItem(sectionId, item.id, { tonalite: e.target.value })} />
            <input className={field} placeholder="Officiant" value={item.officiant ?? ''} onChange={(e) => updateItem(sectionId, item.id, { officiant: e.target.value })} />
            <input className={field} placeholder="Note / remarque" value={item.note ?? ''} onChange={(e) => updateItem(sectionId, item.id, { note: e.target.value })} />
            <input className={field} placeholder="Verset" value={item.verset ?? ''} onChange={(e) => updateItem(sectionId, item.id, { verset: e.target.value })} />
            <input className={field} placeholder="Lien (URL, téléchargeable)" value={item.lien ?? ''} onChange={(e) => updateItem(sectionId, item.id, { lien: e.target.value })} />
          </div>
          {isTrame && (
            <input className={field} placeholder="Fichier .pro (via 📚)" value={item.proFile ?? ''} onChange={(e) => updateItem(sectionId, item.id, { proFile: e.target.value })} />
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input className={field} placeholder="Officiant" value={item.officiant ?? ''} onChange={(e) => updateItem(sectionId, item.id, { officiant: e.target.value })} />
            <input className={field} placeholder="Chant / contenu" value={item.note ?? ''} onChange={(e) => updateItem(sectionId, item.id, { note: e.target.value })} />
            <input className={field} placeholder="Verset" value={item.verset ?? ''} onChange={(e) => updateItem(sectionId, item.id, { verset: e.target.value })} />
            <input className={field} placeholder="Lien (URL, téléchargeable)" value={item.lien ?? ''} onChange={(e) => updateItem(sectionId, item.id, { lien: e.target.value })} />
          </div>
          {/* Lien vers une présentation .pro (ex. Annonces récurrentes, chant du
              service de fidélité) — incluse dans le .proPlaylist. TRAME only. */}
          {isTrame && (
            <input className={field} placeholder="Fichier .pro lié (via 📚)" value={item.proFile ?? ''} onChange={(e) => updateItem(sectionId, item.id, { proFile: e.target.value })} />
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  index,
  count,
  isTrame,
}: {
  section: Section;
  index: number;
  count: number;
  isTrame: boolean;
}) {
  const { renameSection, setSectionColor, removeSection, moveSection, addItem } = useProgrammeEditor();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className={field + ' font-bold uppercase tracking-wide'}
          value={section.label}
          onChange={(e) => renameSection(section.id, e.target.value)}
        />
        <div className="flex shrink-0 items-center gap-1">
          {/* Couleur de la bande de section (PDF). */}
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border" title="Couleur de la bande" style={{ backgroundColor: section.color || '#e8a87e' }}>
            <input
              type="color"
              aria-label="Couleur de la bande de section"
              value={section.color || '#e8a87e'}
              onChange={(e) => setSectionColor(section.id, e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
          {section.color && (
            <IconBtn label="Couleur par défaut" onClick={() => setSectionColor(section.id, undefined)}>⟲</IconBtn>
          )}
          <IconBtn label="Monter la section" onClick={() => moveSection(index, index - 1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn label="Descendre la section" onClick={() => moveSection(index, index + 1)} disabled={index === count - 1}>↓</IconBtn>
          <IconBtn label="Supprimer la section" onClick={() => removeSection(section.id)}>✕</IconBtn>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {section.items.map((it, i) => (
          <ItemRow key={it.id} sectionId={section.id} item={it} index={i} count={section.items.length} isTrame={isTrame} />
        ))}
        {section.items.length === 0 && (
          <p className="py-2 text-center text-sm text-text-muted">Section vide.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => addItem(section.id, 'song', '')}>+ Chant</Button>
        <Button variant="ghost" size="sm" onClick={() => addItem(section.id, 'label', '')}>+ Texte</Button>
      </div>

      <details className="rounded-md border border-border bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted">
          Moments courants
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RECURRING_LABELS.map((label) => (
            <button
              key={label}
              onClick={() => addItem(section.id, 'label', label)}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text focus-visible:shadow-focus focus-visible:outline-none"
            >
              + {label}
            </button>
          ))}
        </div>
      </details>
    </Card>
  );
}

export function ProgrammeEditor({ mode = 'programme' }: { mode?: 'programme' | 'trame' }) {
  const { programme, setMeta, addSection } = useProgrammeEditor();
  const { session } = useSession();
  const library = useLibrary();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{
    proCount: number;
    mediaCount: number;
    missingPresentations: string[];
    missingMedia: string[];
  } | null>(null);
  const [includeLyrics, setIncludeLyrics] = useState(false);
  const dirInputRef = useRef<HTMLInputElement | null>(null);
  const missing = missingProFiles(programme).length;
  const isTrame = mode === 'trame';

  // L'éditeur de trame est réservé au rôle « avancé » (deny-by-default).
  if (isTrame && !canCreateTrame(session)) return <Navigate to="/programme" replace />;

  // Pose webkitdirectory/directory dès la création de l'input → sélecteur de
  // DOSSIER (et non de fichier), de façon fiable y compris dans Brave.
  const setDirInput = (el: HTMLInputElement | null) => {
    dirInputRef.current = el;
    if (el) {
      el.setAttribute('webkitdirectory', '');
      el.setAttribute('directory', '');
      el.setAttribute('mozdirectory', '');
    }
  };
  function onPickDir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) library.connectFiles(files);
  }

  // Raison éventuelle pour laquelle l'export .proPlaylist est bloqué.
  const exportBlock: string | null =
    countSongs(programme) === 0
      ? 'Ajoutez au moins un chant à la trame.'
      : !library.ready
        ? 'Connectez votre dossier ProPresenter (bouton ci-dessus).'
        : null;

  function safeName(): string {
    return (programme.titre || 'programme').replace(/[\\/:*?"<>|]/g, '-');
  }

  async function gatherLyrics(): Promise<Record<string, string[]> | undefined> {
    const fs = library.adapter;
    if (!includeLyrics || !fs) return undefined;
    const { extractLyrics } = await import('../../infrastructure/proplaylist/extractLyrics');
    const files = [...new Set(
      programme.sections.flatMap((s) => s.items).map((i) => i.proFile).filter(Boolean) as string[],
    )];
    const out: Record<string, string[]> = {};
    for (const name of files) {
      const res = await fs.resolvePresentation(name);
      if (res) out[name] = extractLyrics(res.bytes);
    }
    return out;
  }

  async function onPdf() {
    setStatus(null);
    try {
      const lyrics = await gatherLyrics();
      // pdf-lib est lourd : chargé à la demande (code-splitting).
      const { buildProgrammePdf } = await import('../../infrastructure/pdf/buildProgrammePdf');
      const bytes = await buildProgrammePdf(programme, { lyrics });
      downloadBytes(bytes, `${safeName()} - ${programme.date}.pdf`);
    } catch {
      setStatus('Erreur lors de la génération du PDF.');
    }
  }

  async function onExport() {
    setBusy(true);
    setStatus(null);
    setExportResult(null);
    try {
      const fs = library.adapter;
      if (!fs) {
        setStatus('Connectez d’abord votre dossier ProPresenter.');
        return;
      }
      const result = await exportProplaylist(
        { playlistName: `sabbat ${programme.date}`, items: programmeToExportItems(programme) },
        fs,
      );
      downloadBytes(result.zip, `${safeName()} - ${programme.date}.proPlaylist`);
      setExportResult({
        proCount: result.proCount,
        mediaCount: result.mediaCount,
        missingPresentations: result.missingPresentations,
        missingMedia: result.missingMedia,
      });
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
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">
        {isTrame ? 'Éditeur de trame' : 'Éditeur de programme'}
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        {programme.sections.length} section(s) · {countSongs(programme)} chant(s)
        {missing > 0 && <> · <span className="text-warning">{missing} sans .pro</span></>}
      </p>

      {isTrame && supportsFolder && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
          {library.ready ? (
            <Badge tone="success">Bibliothèque connectée · {library.songs.length} chants</Badge>
          ) : (
            <span className="text-sm text-text-secondary">
              Connectez votre dossier ProPresenter pour choisir les chants.
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={library.busy}
            onClick={() => (supportsPersistentFolder ? library.connect() : dirInputRef.current?.click())}
          >
            {library.busy ? 'Connexion…' : library.ready ? 'Changer de dossier' : 'Connecter le dossier'}
          </Button>
          <input ref={setDirInput} type="file" multiple className="hidden" onChange={onPickDir} />
          {supportsPersistentFolder && !library.ready && (
            <span className="text-xs text-text-muted">Le dossier est mémorisé pour les prochaines fois.</span>
          )}
          {library.error && <span className="text-xs text-text-muted">{library.error}</span>}
        </div>
      )}

      {isTrame && (
        <details className="mb-5 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-text-secondary">
            Comment créer un medley ?
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
            <li>Connectez votre dossier ProPresenter (bouton ci-dessus).</li>
            <li>Ajoutez une ligne <strong>+ Chant</strong> dans une section.</li>
            <li>Sur la ligne du chant, cliquez le bouton <strong>Medley</strong>
              (visible seulement sur un chant, bibliothèque connectée).</li>
            <li>Choisissez le <strong>chant de base</strong> à cloner, le
              <strong> titre</strong>, puis saisissez le texte <strong>diapo par
              diapo</strong> (un bloc = une diapo).</li>
            <li>Exportez en <strong>.proPlaylist</strong> : le medley est inclus.</li>
          </ol>
          <p className="mt-2 text-xs text-text-muted">
            Astuce : choisissez un chant de base avec assez de diapos (le surplus
            de textes est ignoré). Doc complète : <code>docs/medley.md</code>.
          </p>
        </details>
      )}

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Titre / occasion</span>
            <input className={field} placeholder="Sabbat 6 juin 2026" value={programme.titre} onChange={(e) => setMeta({ titre: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">Date</span>
            <input type="date" className={field} value={programme.date} onChange={(e) => setMeta({ date: e.target.value })} />
          </label>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {programme.sections.map((s, i) => (
          <SectionCard key={s.id} section={s} index={i} count={programme.sections.length} isTrame={isTrame} />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ajouter une section</div>
        <div className="flex flex-wrap gap-2">
          {(isTrame ? SECTION_PRESETS : PROGRAMME_PRESETS).map((label) => (
            <Button key={label} variant="secondary" size="sm" onClick={() => addSection(label)}>+ {label}</Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => addSection('NOUVELLE SECTION')}>+ Personnalisée</Button>
        </div>
      </div>

      <div className="sticky bottom-0 mt-8 border-t border-border bg-bg/85 py-4 backdrop-blur">
        {isTrame ? (
          <>
            <Button
              variant="accent"
              full
              disabled={busy || exportBlock !== null}
              onClick={onExport}
            >
              {busy ? 'Export…' : 'Exporter en .proPlaylist'}
            </Button>
            {exportBlock && (
              <p className="mt-2 text-center text-xs text-warning">{exportBlock}</p>
            )}
            {exportResult && (
              <div className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
                <p className="font-semibold text-success">
                  ✓ Export réussi — {exportResult.proCount} chant(s) lié(s),{' '}
                  {exportResult.mediaCount} média(s) inclus.
                </p>
                {exportResult.missingPresentations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-warning">
                      À ajouter à la main dans ProPresenter (chant introuvable) :
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-text-secondary">
                      {exportResult.missingPresentations.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {exportResult.missingMedia.length > 0 && (
                  <p className="mt-2 text-xs text-text-muted">
                    {exportResult.missingMedia.length} média(s) introuvable(s) (fond à remettre dans ProPresenter).
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={includeLyrics}
                onChange={(e) => setIncludeLyrics(e.target.checked)}
              />
              Inclure les paroles des chants (depuis la bibliothèque)
            </label>
            {includeLyrics && !library.ready && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-text-muted">Bibliothèque non connectée.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (supportsPersistentFolder ? library.connect() : dirInputRef.current?.click())}
                >
                  Connecter le dossier
                </Button>
                <input ref={setDirInput} type="file" multiple className="hidden" onChange={onPickDir} />
              </div>
            )}
            <Button
              variant="secondary"
              full
              disabled={programme.sections.length === 0}
              onClick={onPdf}
            >
              Télécharger le PDF
            </Button>
          </div>
        )}
        {status && <p className="mt-2 text-center text-xs font-semibold text-text-secondary">{status}</p>}
      </div>
    </main>
  );
}

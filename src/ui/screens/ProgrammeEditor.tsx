import { useState, useRef, useMemo, useEffect, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Switch } from "../components/Switch";
import { useProgrammeEditor } from "../stores/programmeEditor";
import { useSession } from "../stores/session";
import {
  useLibrary,
  supportsFolder,
  supportsPersistentFolder,
} from "../stores/library";
import { SongPicker } from "../components/SongPicker";
import { MedleyDialog } from "../components/MedleyDialog";
import { canCreateTrame } from "../../domain/auth/access";
import { countSongs, missingProFiles } from "../../domain/trame/programme";
import {
  RECURRING_MOMENTS,
  CUSTOM_TEXT_BASE_PRO_FILE,
} from "../../domain/trame/recurring";
import { SECTION_DEFAULT_ITEMS } from "../../domain/trame/sectionDefaults";
import { findSongByExactName } from "../../domain/library/song";
import type { Section, TrameItem } from "../../domain/trame/types";
import { exportProplaylist } from "../../application/usecases/exportProplaylist";
import { programmeToExportItems } from "../../application/usecases/programmeToExportItems";
import { downloadBytes } from "../lib/download";
import { usePersistedState } from "../lib/usePersistedState";

// Trame : liste complète (séquence technique variée).
const SECTION_PRESETS = [
  "ÉCOLE DU SABBAT",
  "CULTE D'ADORATION",
  "TEMPS DE LOUANGES",
  "ANNONCES",
  "INTERCESSION",
  "PRÉLUDE",
  "POSTLUDE",
];

// Programme : en pratique seulement 2 sections récurrentes.
const PROGRAMME_PRESETS = ["ÉCOLE DU SABBAT", "CULTE D'ADORATION"];

const field =
  "min-h-[40px] w-full rounded-md border border-border bg-surface px-3 text-sm text-text " +
  "placeholder:text-text-muted focus-visible:shadow-focus focus-visible:outline-none focus-visible:border-primary";

/** Icône « notes de musique » pour Créer un chant / medley. */
function SongIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18V6l9-2.2v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9.2l9-2.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="6.4"
        cy="18"
        r="3.1"
        fill="var(--primary)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="15.4"
        cy="15.8"
        r="3.1"
        fill="var(--accent)"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

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
  const { updateItem, removeItem, moveItem, moveItemToSection } =
    useProgrammeEditor();
  // Sélectionne la référence STABLE (le tableau de sections lui-même, recréé
  // seulement quand les sections changent) puis filtre en mémo : un sélecteur
  // qui renvoie un nouveau tableau à chaque rendu ferait boucler
  // useSyncExternalStore (Zustand v5) → écran blanc en production.
  const allSections = useProgrammeEditor((s) => s.programme.sections);
  const otherSections = useMemo(
    () => allSections.filter((sec) => sec.id !== sectionId),
    [allSections, sectionId],
  );
  const [picking, setPicking] = useState(false);
  const [medley, setMedley] = useState(false);
  const isSong = item.type === "song";
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
              isSong
                ? { titre: c.titre, ref: c.ref, proFile: c.proFile }
                : { proFile: c.proFile },
            )
          }
        />
      )}
      {medley && (
        <MedleyDialog
          initial={
            item.customSong
              ? {
                  titre: item.titre,
                  baseProFile: item.customSong.baseProFile,
                  slides: item.customSong.slides,
                  groups: item.customSong.groups,
                }
              : { titre: item.titre }
          }
          fixedBaseProFile={isSong ? undefined : CUSTOM_TEXT_BASE_PRO_FILE}
          onClose={() => setMedley(false)}
          onSave={(v) =>
            updateItem(sectionId, item.id, {
              titre: v.titre,
              customSong: {
                baseProFile: v.baseProFile,
                slides: v.slides,
                groups: v.groups,
              },
            })
          }
        />
      )}
      {/* Menu élément : uniquement des actions (type, couleur, liaison .pro,
          déplacement, suppression) — le titre vit désormais dans la grille de
          champs ci-dessous, à côté de ses champs associés. */}
      <div className="flex items-center gap-2">
        <button
          aria-label={isSong ? "Basculer en libellé" : "Basculer en chant"}
          title={isSong ? "Chant" : "Libellé"}
          onClick={() =>
            updateItem(sectionId, item.id, { type: isSong ? "label" : "song" })
          }
          className="shrink-0"
        >
          <Badge tone={isSong ? "primary" : "neutral"}>
            {isSong ? "Chant" : "Texte"}
          </Badge>
        </button>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
          {/* Couleur du titre (optionnelle) : répercutée sur le PDF. */}
          <span
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface"
            title="Couleur du titre"
          >
            <span
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: item.color || "#1a1f29" }}
            />
            <input
              type="color"
              aria-label="Couleur du titre"
              value={item.color || "#1a1f29"}
              onChange={(e) =>
                updateItem(sectionId, item.id, { color: e.target.value })
              }
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
          {item.color && (
            <IconBtn
              label="Couleur par défaut"
              onClick={() =>
                updateItem(sectionId, item.id, { color: undefined })
              }
            >
              ⟲
            </IconBtn>
          )}
          {/* Lier un .pro : toujours visible (programme ET trame). Ne pas le
              cacher derrière `libraryReady` — sinon l'option disparaît sans
              explication tant que le dossier n'est pas (re)connecté après un
              rechargement. Le sélecteur lui-même guide si rien n'est connecté. */}
          <IconBtn
            label="Lier à la bibliothèque"
            onClick={() => setPicking(true)}
          >
            📚
          </IconBtn>
          {/* Diapo personnalisée (medley/verset) : visible aussi sur PROGRAMME
              (pas seulement trame) — utile pour préparer le contenu même
              avant l'export .proPlaylist, qui reste réservé à la trame. */}
          <button
            type="button"
            title="Diapo personnalisée : chant, medley ou verset biblique"
            onClick={() => setMedley(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
          >
            <SongIcon />
            {isSong ? "Créer le chant" : "Texte personnalisé"}
          </button>
          <IconBtn
            label="Monter"
            onClick={() => moveItem(sectionId, index, index - 1)}
            disabled={index === 0}
          >
            ↑
          </IconBtn>
          <IconBtn
            label="Descendre"
            onClick={() => moveItem(sectionId, index, index + 1)}
            disabled={index === count - 1}
          >
            ↓
          </IconBtn>
          {otherSections.length > 0 && (
            <select
              aria-label="Déplacer vers une autre section"
              title="Déplacer vers une autre section"
              value=""
              onChange={(e) => {
                if (e.target.value)
                  moveItemToSection(sectionId, item.id, e.target.value);
              }}
              className="h-9 max-w-[7.5rem] rounded-md border border-border bg-surface px-1.5 text-xs text-text-secondary hover:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none"
            >
              <option value="">Déplacer vers…</option>
              {otherSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label || "Sans titre"}
                </option>
              ))}
            </select>
          )}
          <IconBtn
            label="Supprimer"
            onClick={() => removeItem(sectionId, item.id)}
          >
            ✕
          </IconBtn>
        </div>
      </div>
      {isSong ? (
        <div className="mt-2 flex flex-col gap-2">
          {/* Titre | Réf | Tonalité */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              className={field}
              placeholder="Titre du chant"
              value={item.titre}
              onChange={(e) =>
                updateItem(sectionId, item.id, { titre: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Réf (H&L 508)"
              value={item.ref ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { ref: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Tonalité"
              value={item.tonalite ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { tonalite: e.target.value })
              }
            />
          </div>
          {/* Officiant | Note/remarque | Verset | Lien */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              className={field}
              placeholder="Officiant"
              value={item.officiant ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { officiant: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Note / remarque"
              value={item.note ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { note: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Verset"
              value={item.verset ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { verset: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Lien (URL, téléchargeable)"
              value={item.lien ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { lien: e.target.value })
              }
            />
          </div>
          {/* Fichier .pro */}
          <input
            className={field}
            placeholder="Fichier .pro (via 📚)"
            value={item.proFile ?? ""}
            onChange={(e) =>
              updateItem(sectionId, item.id, { proFile: e.target.value })
            }
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {/* Titre | Officiant | Chant/contenu */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              className={field}
              placeholder="Moment liturgique (ex : Bienvenue)"
              value={item.titre}
              onChange={(e) =>
                updateItem(sectionId, item.id, { titre: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Officiant"
              value={item.officiant ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { officiant: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Chant / contenu"
              value={item.note ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { note: e.target.value })
              }
            />
          </div>
          {/* Verset | Lien */}
          <div className="grid grid-cols-2 gap-2">
            <input
              className={field}
              placeholder="Verset"
              value={item.verset ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { verset: e.target.value })
              }
            />
            <input
              className={field}
              placeholder="Lien (URL, téléchargeable)"
              value={item.lien ?? ""}
              onChange={(e) =>
                updateItem(sectionId, item.id, { lien: e.target.value })
              }
            />
          </div>
          {/* Fichier .pro — utile en programme (pré-lier avant de créer la
              trame) et repris tel quel dans le .proPlaylist en trame. */}
          <input
            className={field}
            placeholder="Fichier .pro lié (via 📚)"
            value={item.proFile ?? ""}
            onChange={(e) =>
              updateItem(sectionId, item.id, { proFile: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  index,
  count,
}: {
  section: Section;
  index: number;
  count: number;
}) {
  const {
    renameSection,
    setSectionColor,
    removeSection,
    moveSection,
    addItem,
  } = useProgrammeEditor();
  const songs = useLibrary((s) => s.songs);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          className={field + " font-bold uppercase tracking-wide"}
          value={section.label}
          onChange={(e) => renameSection(section.id, e.target.value)}
        />
        <div className="flex shrink-0 items-center gap-1">
          {/* Couleur de la bande de section (PDF). */}
          <span
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
            title="Couleur de la bande"
            style={{ backgroundColor: section.color || "#e8a87e" }}
          >
            <input
              type="color"
              aria-label="Couleur de la bande de section"
              value={section.color || "#e8a87e"}
              onChange={(e) => setSectionColor(section.id, e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </span>
          {section.color && (
            <IconBtn
              label="Couleur par défaut"
              onClick={() => setSectionColor(section.id, undefined)}
            >
              ⟲
            </IconBtn>
          )}
          <IconBtn
            label="Monter la section"
            onClick={() => moveSection(index, index - 1)}
            disabled={index === 0}
          >
            ↑
          </IconBtn>
          <IconBtn
            label="Descendre la section"
            onClick={() => moveSection(index, index + 1)}
            disabled={index === count - 1}
          >
            ↓
          </IconBtn>
          <IconBtn
            label="Supprimer la section"
            onClick={() => removeSection(section.id)}
          >
            ✕
          </IconBtn>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {section.items.map((it, i) => (
          <ItemRow
            key={it.id}
            sectionId={section.id}
            item={it}
            index={i}
            count={section.items.length}
          />
        ))}
        {section.items.length === 0 && (
          <p className="py-2 text-center text-sm text-text-muted">
            Section vide.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => addItem(section.id, "song", "")}
        >
          + Chant
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => addItem(section.id, "label", "")}
        >
          + Texte
        </Button>
      </div>

      <details className="rounded-md border border-border bg-surface-2 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted">
          Moments courants
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RECURRING_MOMENTS.map((moment) => (
            <button
              key={moment.label}
              onClick={() => {
                // Pré-lie automatiquement la diapo-titre si elle existe déjà
                // dans la bibliothèque connectée (sinon l'item est ajouté sans
                // .pro, à lier à la main comme d'habitude).
                const match = findSongByExactName(songs, moment.matchKeys);
                addItem(
                  section.id,
                  moment.type,
                  moment.label,
                  match ? { proFile: match.name } : {},
                );
              }}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text focus-visible:shadow-focus focus-visible:outline-none"
            >
              + {moment.label}
            </button>
          ))}
        </div>
      </details>
    </Card>
  );
}

/**
 * Aperçu — copie CONFORME du PDF téléchargé : même fonction de génération
 * (buildProgrammePdf), affichée via un blob URL dans une iframe (rendu PDF
 * natif du navigateur), pas une approximation HTML. Recalculée avec un
 * léger débounce pendant la frappe pour éviter de régénérer à chaque
 * caractère (buildProgrammePdf + gatherLyrics ne sont pas gratuits).
 */
function PdfPreview({
  url,
  loading,
}: {
  url: string | null;
  loading: boolean;
}) {
  return (
    <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">Aperçu (identique au PDF téléchargé)</h2>
        {loading && <span className="text-xs text-text-muted">Mise à jour…</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border-strong bg-white">
        {url ? (
          <iframe title="Aperçu du PDF" src={url} className="h-full w-full" />
        ) : (
          <p className="p-4 text-center text-sm text-text-muted">
            Ajoutez une section pour voir l'aperçu.
          </p>
        )}
      </div>
    </div>
  );
}

export function ProgrammeEditor({
  mode = "programme",
}: {
  mode?: "programme" | "trame";
}) {
  const { programme, setMeta, addSection, addItem } = useProgrammeEditor();
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
  // Réglages d'export PDF : mémorisés (localStorage) d'une session à l'autre.
  const [includeLyrics, setIncludeLyrics] = usePersistedState("pdf.includeLyrics", false);
  const [pdfFont, setPdfFont] = usePersistedState<"segoe" | "libre-franklin">("pdf.font", "segoe");
  const [showPreview, setShowPreview] = usePersistedState("pdf.showPreview", false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);
  const missing = missingProFiles(programme).length;
  const isTrame = mode === "trame";

  // L'éditeur de trame est réservé au rôle « avancé » (deny-by-default).
  if (isTrame && !canCreateTrame(session))
    return <Navigate to="/programme" replace />;

  // Pose webkitdirectory/directory dès la création de l'input → sélecteur de
  // DOSSIER (et non de fichier), de façon fiable y compris dans Brave.
  const setDirInput = (el: HTMLInputElement | null) => {
    dirInputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
      el.setAttribute("mozdirectory", "");
    }
  };
  function onPickDir(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) library.connectFiles(files);
  }

  // Crée la section preset ; si un .pro correspondant existe déjà dans la
  // bibliothèque connectée, ajoute un item par défaut pré-lié. Sinon (pas de
  // correspondance, ex. Culte d'adoration/Temps de louanges dont le contenu
  // change chaque semaine) : section vide, comme avant.
  function addSectionPreset(label: string) {
    addSection(label);
    const spec = SECTION_DEFAULT_ITEMS[label];
    if (!spec) return;
    const match = findSongByExactName(library.songs, spec.matchKeys);
    if (!match) return;
    const created = useProgrammeEditor.getState().programme;
    const newSection = created.sections[created.sections.length - 1];
    addItem(newSection.id, spec.type, spec.titre, { proFile: match.name });
  }

  // Raison éventuelle pour laquelle l'export .proPlaylist est bloqué.
  // L'export a besoin des VRAIS fichiers (dossier local) — l'index partagé
  // (noms seulement) ne suffit pas pour générer le .proPlaylist.
  const exportBlock: string | null =
    countSongs(programme) === 0
      ? "Ajoutez au moins un chant à la trame."
      : !library.adapter
        ? supportsPersistentFolder
          ? "Connectez votre dossier ProPresenter (bouton ci-dessus)."
          : "Reconnectez votre dossier ProPresenter (bouton ci-dessus) — ce navigateur ne le mémorise pas d'une session à l'autre."
        : null;

  function safeName(): string {
    return (programme.titre || "programme").replace(/[\\/:*?"<>|]/g, "-");
  }

  async function gatherLyrics() {
    if (!includeLyrics) return undefined;
    const items = programme.sections.flatMap((s) => s.items);
    const out: Record<
      string,
      import("../../infrastructure/proplaylist/extractGroupedLyrics").LyricGroup[]
    > = {};

    // Chants personnalisés (medley / verset / texte) : paroles déjà connues
    // (saisies dans le dialogue), aucun fichier à lire pour elles.
    for (const it of items) {
      const cs = it.customSong;
      if (!cs?.slides.length) continue;
      const groups = cs.slides
        .map((text, i) => ({
          groupe: cs.groups?.[i],
          lignes: text.split("\n").filter(Boolean),
        }))
        .filter((g) => g.lignes.length > 0);
      if (groups.length) out[it.id] = groups;
    }

    // Chants réels de la bibliothèque : lecture + décodage groupé du .pro
    // (Couplet/Refrain…), avec repli sur un texte simple si pas de groupes.
    const fs = library.adapter;
    if (fs) {
      const { extractGroupedLyrics } =
        await import("../../infrastructure/proplaylist/extractGroupedLyrics");
      const cache = new Map<string, ReturnType<typeof extractGroupedLyrics>>();
      for (const it of items) {
        if (!it.proFile || out[it.id]) continue;
        let groups = cache.get(it.proFile);
        if (!groups) {
          const res = await fs.resolvePresentation(it.proFile);
          groups = res ? extractGroupedLyrics(res.bytes) : [];
          cache.set(it.proFile, groups);
        }
        if (groups.length) out[it.id] = groups;
      }
    }

    return Object.keys(out).length ? out : undefined;
  }

  // Aperçu = copie CONFORME du PDF téléchargé (même fonction de génération),
  // recalculée avec un léger débounce pendant la frappe. Désactivé par
  // défaut (activation explicite via le bouton) pour ne jamais régénérer le
  // PDF sans que l'utilisateur l'ait demandé.
  useEffect(() => {
    if (isTrame || !showPreview) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setPreviewUrl(null);
      }
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const lyrics = await gatherLyrics();
        const { buildProgrammePdf } =
          await import("../../infrastructure/pdf/buildProgrammePdf");
        const bytes = await buildProgrammePdf(programme, { lyrics, font: pdfFont });
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([bytes.slice()], { type: "application/pdf" }));
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch {
        /* aperçu silencieusement indisponible ; le bouton de téléchargement reste la source fiable */
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programme, includeLyrics, pdfFont, showPreview, isTrame]);

  // Libère l'URL du blob à la fermeture de l'écran.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function onPdf() {
    setStatus(null);
    try {
      const lyrics = await gatherLyrics();
      // pdf-lib est lourd : chargé à la demande (code-splitting).
      const { buildProgrammePdf } =
        await import("../../infrastructure/pdf/buildProgrammePdf");
      const bytes = await buildProgrammePdf(programme, { lyrics, font: pdfFont });
      downloadBytes(bytes, `${safeName()} - ${programme.date}.pdf`);
    } catch {
      setStatus("Erreur lors de la génération du PDF.");
    }
  }

  async function onExport() {
    setBusy(true);
    setStatus(null);
    setExportResult(null);
    try {
      const fs = library.adapter;
      if (!fs) {
        setStatus("Connectez d’abord votre dossier ProPresenter.");
        return;
      }
      const result = await exportProplaylist(
        {
          playlistName: `sabbat ${programme.date}`,
          items: programmeToExportItems(programme),
        },
        fs,
      );
      downloadBytes(
        result.zip,
        `${safeName()} - ${programme.date}.proPlaylist`,
      );
      setExportResult({
        proCount: result.proCount,
        mediaCount: result.mediaCount,
        missingPresentations: result.missingPresentations,
        missingMedia: result.missingMedia,
      });
    } catch (e) {
      setStatus(
        e instanceof Error ? `Annulé : ${e.message}` : "Erreur inattendue",
      );
    } finally {
      setBusy(false);
    }
  }

  const previewOn = showPreview && !isTrame;
  return (
    <div
      className={[
        "flex gap-6 px-4 py-8 sm:px-8",
        previewOn ? "mx-auto max-w-[1600px]" : "mx-auto max-w-5xl",
      ].join(" ")}
    >
    <main className="min-w-0 flex-1">
      <Link
        to="/creator"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text"
      >
        ← Tableau de bord
      </Link>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isTrame ? "Éditeur de trame" : "Éditeur de programme"}
        </h1>
        {!isTrame && (
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={includeLyrics}
              onChange={setIncludeLyrics}
              label="Inclure les paroles des chants"
            />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              Police du PDF
              <select
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                value={pdfFont}
                onChange={(e) =>
                  setPdfFont(e.target.value as "segoe" | "libre-franklin")
                }
              >
                <option value="segoe">Segoe UI (historique)</option>
                <option value="libre-franklin">Libre Franklin</option>
              </select>
            </label>
            <Button
              variant={previewOn ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
              title="Aperçu en temps réel, identique au PDF téléchargé"
            >
              {previewOn ? "Masquer l'aperçu" : "Afficher l'aperçu"}
            </Button>
          </div>
        )}
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        {programme.sections.length} section(s) · {countSongs(programme)}{" "}
        chant(s)
        {missing > 0 && (
          <>
            {" "}
            · <span className="text-warning">{missing} sans .pro</span>
          </>
        )}
      </p>

      {/* Connexion au dossier ProPresenter : disponible en programme ET en
          trame, pour pouvoir lier un .pro dès la composition du programme.
          Sans dossier local, on se connecte automatiquement à la
          bibliothèque R2 (permanente, en ligne) : pas besoin de dossier
          local pour chercher/lier un chant ni pour exporter. */}
      {supportsFolder && (
        <div
          className={[
            "mb-5 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3",
            isTrame && !library.adapter && countSongs(programme) > 0
              ? "border-accent bg-accent-soft"
              : "border-border bg-surface-2",
          ].join(" ")}
        >
          {library.source === "local" ? (
            <Badge tone="success">
              Bibliothèque connectée · {library.songs.length} chants
            </Badge>
          ) : library.source === "r2" ? (
            <Badge tone="success">
              Bibliothèque en ligne · {library.songs.length} chants
            </Badge>
          ) : (
            <span className="text-sm text-text-secondary">
              Connectez votre dossier ProPresenter pour choisir les chants.
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={library.busy}
            onClick={() =>
              supportsPersistentFolder
                ? library.connect()
                : dirInputRef.current?.click()
            }
          >
            {library.busy
              ? "Connexion…"
              : library.source === "local"
                ? "Changer de dossier"
                : "Connecter le dossier"}
          </Button>
          <input
            ref={setDirInput}
            type="file"
            multiple
            className="hidden"
            onChange={onPickDir}
          />
          {supportsPersistentFolder ? (
            library.source !== "local" && (
              <span className="text-xs text-text-muted">
                Le dossier choisi est mémorisé : après un rechargement, un
                simple clic de confirmation suffit (pas besoin de le
                re-sélectionner).
              </span>
            )
          ) : (
            <span className="text-xs text-text-muted">
              Ce navigateur (Brave, Firefox…) ne mémorise pas le dossier : il
              faut le re-sélectionner entièrement à chaque rechargement de page.
              Pour n'avoir qu'un clic de confirmation, utilisez Chrome ou Edge.
            </span>
          )}
          {library.error && (
            <span className="text-xs text-text-muted">{library.error}</span>
          )}
        </div>
      )}

      {isTrame && (
        <details className="mb-5 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-text-secondary">
            Comment créer un chant (ou un medley) ?
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
            <li>Connectez votre dossier ProPresenter (bouton ci-dessus).</li>
            <li>
              Ajoutez une ligne <strong>+ Chant</strong> dans une section.
            </li>
            <li>
              Sur la ligne du chant, cliquez <strong>Créer le chant</strong>
              (visible seulement sur un chant, bibliothèque connectée).
            </li>
            <li>
              Choisissez un <strong>chant modèle</strong> (mise en forme &
              fond), le <strong>titre</strong>, puis saisissez le texte{" "}
              <strong>diapo par diapo</strong> (un bloc = une diapo).
            </li>
            <li>
              Exportez en <strong>.proPlaylist</strong> : le chant est inclus.
            </li>
          </ol>
          <p className="mt-2 text-xs text-text-muted">
            Un <strong>medley</strong> se crée exactement de la même façon : il
            suffit de mettre les strophes des différents chants à la suite.
            Astuce : prenez un chant modèle avec assez de diapos (le surplus de
            textes est ignoré). Pour un <strong>texte</strong> (moment,
            verset…), aucun modèle à choisir : il est généré automatiquement.
            Doc : <code>docs/medley.md</code>.
          </p>
        </details>
      )}

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Titre / occasion
            </span>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <input
                  className={field}
                  placeholder="Sabbat 6 juin 2026"
                  value={programme.titre}
                  onChange={(e) => setMeta({ titre: e.target.value })}
                />
              </label>
              {/* Couleur du bandeau de titre (PDF) — même mécanique que les sections ;
                  HORS du <label> ci-dessus : un <label> ne doit envelopper qu'UN
                  seul champ, sinon le focus/clic devient imprévisible selon le
                  navigateur (la sélection de couleur restait "active" et bloquait
                  la page). */}
              <span
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
                title="Couleur du bandeau de titre"
                style={{ backgroundColor: programme.titleColor || "#a3ccea" }}
              >
                <input
                  type="color"
                  aria-label="Couleur du bandeau de titre"
                  value={programme.titleColor || "#a3ccea"}
                  onChange={(e) => setMeta({ titleColor: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              {programme.titleColor && (
                <IconBtn
                  label="Couleur par défaut"
                  onClick={() => setMeta({ titleColor: undefined })}
                >
                  ⟲
                </IconBtn>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-secondary">
              Date
            </span>
            <input
              type="date"
              className={field}
              value={programme.date}
              onChange={(e) => setMeta({ date: e.target.value })}
            />
          </label>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {programme.sections.map((s, i) => (
          <SectionCard
            key={s.id}
            section={s}
            index={i}
            count={programme.sections.length}
          />
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Ajouter une section
        </div>
        <div className="flex flex-wrap gap-2">
          {(isTrame ? SECTION_PRESETS : PROGRAMME_PRESETS).map((label) => (
            <Button
              key={label}
              variant="secondary"
              size="sm"
              onClick={() =>
                isTrame ? addSectionPreset(label) : addSection(label)
              }
            >
              + {label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addSection("NOUVELLE SECTION")}
          >
            + Personnalisée
          </Button>
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
              {busy ? "Export…" : "Exporter en .proPlaylist"}
            </Button>
            {exportBlock && (
              <p className="mt-2 text-center text-xs text-warning">
                {exportBlock}
              </p>
            )}
            {exportResult && (
              <div className="mt-3 rounded-md border border-border bg-surface-2 p-3 text-sm">
                <p className="font-semibold text-success">
                  ✓ Export réussi — {exportResult.proCount} chant(s) lié(s),{" "}
                  {exportResult.mediaCount} média(s) inclus.
                </p>
                {exportResult.missingPresentations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-warning">
                      À ajouter à la main dans ProPresenter (chant introuvable)
                      :
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
                    {exportResult.missingMedia.length} média(s) introuvable(s)
                    (fond à remettre dans ProPresenter).
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {includeLyrics && !library.adapter && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-text-muted">
                  Bibliothèque non connectée.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    supportsPersistentFolder
                      ? library.connect()
                      : dirInputRef.current?.click()
                  }
                >
                  Connecter le dossier
                </Button>
                <input
                  ref={setDirInput}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onPickDir}
                />
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
        {status && (
          <p className="mt-2 text-center text-xs font-semibold text-text-secondary">
            {status}
          </p>
        )}
      </div>
    </main>
    {previewOn && (
      <aside className="hidden w-[45%] shrink-0 lg:block">
        <PdfPreview url={previewUrl} loading={previewLoading} />
      </aside>
    )}
    </div>
  );
}

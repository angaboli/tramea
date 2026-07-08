import { useEffect, useRef, useState } from 'react';

/**
 * Sélecteur de couleur MAISON (palette de pastilles), PAS un <input
 * type="color"> natif : ce dernier ouvre parfois (Brave notamment) l'outil
 * pipette du système, qui peut geler tout le navigateur (page + onglets),
 * même après Échap. Une palette en pur React évite complètement ce risque.
 */
const PALETTE = [
  '#e8a87e', // saumon (défaut section)
  '#a3ccea', // bleu clair (défaut titre)
  '#2F557F', // bleu primaire
  '#FF6C1A', // orange accent
  '#8fd0b0', // vert doux
  '#c9a8e8', // violet doux
  '#f2d16b', // jaune doux
  '#e89aa8', // rose doux
];

export function ColorPicker({
  label,
  value,
  defaultValue,
  onChange,
  onReset,
}: {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (color: string) => void;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const swatch = value || defaultValue;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
        style={{ backgroundColor: swatch }}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-44 rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <div className="grid grid-cols-4 gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Choisir ${c}`}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={[
                  'h-8 w-8 rounded-md border transition-transform hover:scale-110',
                  swatch.toLowerCase() === c.toLowerCase() ? 'border-2 border-primary' : 'border-border',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {onReset && value && (
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="mt-3 w-full rounded-md border border-border-strong py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover"
            >
              ⟲ Couleur par défaut
            </button>
          )}
        </div>
      )}
    </div>
  );
}

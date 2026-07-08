/**
 * Interrupteur à bascule (pilule + rond coulissant) — repris du système
 * Stitch (gestion_des_rôles). Checkbox natif caché pour l'accessibilité
 * (label, focus clavier), stylé via `peer`.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={[
            "absolute inset-0 rounded-full transition-colors",
            "peer-checked:bg-primary bg-border-strong",
            "peer-focus-visible:shadow-focus",
          ].join(" ")}
        />
        <span
          className={[
            "relative h-[18px] w-[18px] translate-x-[3px] rounded-full bg-white shadow-sm transition-transform",
            "peer-checked:translate-x-[23px]",
          ].join(" ")}
        />
      </span>
      {label}
    </label>
  );
}

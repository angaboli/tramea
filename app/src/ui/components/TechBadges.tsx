const TECHS = [
  'React',
  'TypeScript',
  'Vite',
  'Tailwind',
  'Zustand',
  'PWA / offline',
  'Supabase',
  'pdf-lib',
  'fflate',
  'IndexedDB',
  'Vitest',
];

/** Badges des technologies utilisées par Tramea. */
export function TechBadges({ className = '' }: { className?: string }) {
  return (
    <div className={['flex flex-wrap items-center gap-2', className].join(' ')}>
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Construit avec
      </span>
      {TECHS.map((t) => (
        <span
          key={t}
          className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-secondary"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

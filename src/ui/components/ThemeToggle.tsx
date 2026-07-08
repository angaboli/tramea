import { useTheme } from '../stores/theme';

const IconSun = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
const IconMoon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const seg = (active: boolean) =>
    [
      'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
      active ? 'bg-surface text-text shadow-sm' : 'bg-transparent text-text-muted hover:text-text',
    ].join(' ');
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle p-1"
      role="group"
      aria-label="Thème"
    >
      <button
        className={seg(theme === 'light')}
        onClick={() => setTheme('light')}
        title="Thème clair"
        aria-label="Thème clair"
        aria-pressed={theme === 'light'}
      >
        {IconSun}
      </button>
      <button
        className={seg(theme === 'dark')}
        onClick={() => setTheme('dark')}
        title="Thème sombre"
        aria-label="Thème sombre"
        aria-pressed={theme === 'dark'}
      >
        {IconMoon}
      </button>
    </div>
  );
}

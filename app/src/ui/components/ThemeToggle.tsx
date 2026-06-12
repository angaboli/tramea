import { useTheme } from '../stores/theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const seg = (active: boolean) =>
    [
      'inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors',
      active ? 'bg-surface text-text shadow-sm' : 'bg-transparent text-text-muted',
    ].join(' ');
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle p-1"
      role="group"
      aria-label="Thème"
    >
      <button className={seg(theme === 'light')} onClick={() => setTheme('light')}>
        Clair
      </button>
      <button className={seg(theme === 'dark')} onClick={() => setTheme('dark')}>
        Sombre
      </button>
    </div>
  );
}

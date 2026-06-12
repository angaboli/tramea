import { create } from 'zustand';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'tramea.theme';

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function initialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'light';
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const theme = initialTheme();
  applyTheme(theme);
  const persist = (t: Theme) => {
    applyTheme(t);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, t);
    set({ theme: t });
  };
  return {
    theme,
    setTheme: persist,
    toggle: () => persist(get().theme === 'light' ? 'dark' : 'light'),
  };
});

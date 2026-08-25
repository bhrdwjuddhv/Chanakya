import { create } from 'zustand';

const KEY = 'chanakya.theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

const read = () => {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
};

const apply = (theme) => {
  const dark = theme === 'dark' || (theme === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  return dark;
};

export const useTheme = create((set, get) => ({
  theme: read(),
  isDark: apply(read()),

  setTheme(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode — the choice just won't survive a reload */
    }
    set({ theme, isDark: apply(theme) });
  },

  /** Cycles light → dark → system, so "follow the OS" stays reachable from the toggle. */
  cycle() {
    const order = ['light', 'dark', 'system'];
    get().setTheme(order[(order.indexOf(get().theme) + 1) % order.length]);
  },

  /** Keeps a 'system' choice live when the OS flips mode mid-session. */
  watchSystem() {
    const listener = () => {
      if (get().theme === 'system') set({ isDark: apply('system') });
    };
    media().addEventListener('change', listener);
    return () => media().removeEventListener('change', listener);
  },
}));

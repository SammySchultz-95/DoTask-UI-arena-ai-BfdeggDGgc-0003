/**
 * Panel color themes. The default (`green`) is the original black + neon
 * green look; the others are skinned through CSS variables in globals.css
 * by setting `data-theme` on <html>. The choice persists in localStorage.
 */
export const THEME_STORAGE_KEY = 'dotask-theme';

export interface ThemeOption {
  id: string;
  label: string;
  /** Preview swatches: [surface, accent, text] for the picker cards. */
  preview: [string, string, string];
  light?: boolean;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'green',
    label: 'Green Neon',
    preview: ['#080d0a', '#00f58b', '#e6f2ea'],
  },
  {
    id: 'red',
    label: 'Red Neon',
    preview: ['#0d0808', '#ff3d3d', '#eae7e7'],
  },
  {
    id: 'cyan',
    label: 'Cyan Neon',
    preview: ['#080d10', '#00cdf5', '#e6f2f5'],
  },
  {
    id: 'blue',
    label: 'Blue Neon',
    preview: ['#070b10', '#1e8fff', '#e6edf5'],
  },
  {
    id: 'violet',
    label: 'Violet Neon',
    preview: ['#0b0810', '#8b3dff', '#eae6f2'],
  },
  {
    id: 'magenta',
    label: 'Magenta Neon',
    preview: ['#100710', '#ff2eaf', '#eee5ed'],
  },
  {
    id: 'amber',
    label: 'Amber Neon',
    preview: ['#0d0a06', '#ffb000', '#ece6dc'],
  },
  {
    id: 'silver',
    label: 'Silver Neon',
    preview: ['#0a0b0b', '#9faeb4', '#edf1f2'],
  },
  {
    id: 'light',
    label: 'Daylight',
    preview: ['#f1f4f2', '#00a45d', '#10201a'],
    light: true,
  },
  {
    id: 'paper',
    label: 'Paper (sepia)',
    preview: ['#f4f1ea', '#8c4a1f', '#2b241c'],
    light: true,
  },
  {
    id: 'slate',
    label: 'Slate (cool)',
    preview: ['#eef1f4', '#1f5688', '#1a242e'],
    light: true,
  },
];

export function isValidTheme(id: unknown): id is string {
  return typeof id === 'string' && THEMES.some((theme) => theme.id === id);
}

export function applyTheme(id: string): void {
  if (typeof document === 'undefined' || !isValidTheme(id)) return;
  document.documentElement.setAttribute('data-theme', id);
}

export function getStoredTheme(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(id: string): void {
  if (typeof window === 'undefined' || !isValidTheme(id)) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* storage unavailable — theme still applies for this tab */
  }
}

'use client';

import { Check } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme, storeTheme } from '@/lib/themes';
import { useState } from 'react';

/**
 * Color theme picker (Settings → General). Renders a card per theme with a
 * live preview strip; the selection applies immediately and persists in
 * localStorage (an inline script in the root layout applies it pre-paint).
 */
export function ThemeSwitcher() {
  const [active, setActive] = useState<string>(() => getStoredTheme() ?? 'green');

  function select(id: string) {
    applyTheme(id);
    storeTheme(id);
    setActive(id);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {THEMES.map((theme) => {
        const selected = active === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => select(theme.id)}
            className={`group overflow-hidden rounded-xl border text-left transition ${
              selected
                ? 'border-neon-500/70 shadow-glow-sm'
                : 'border-ink-500 hover:border-neon-500/40'
            }`}
          >
            {/* Mini preview of the theme */}
            <div
              className="relative h-16 w-full"
              style={{ background: theme.preview[0] }}
            >
              <div
                className="absolute inset-x-3 top-3 h-2.5 rounded-full"
                style={{ background: theme.preview[1] }}
              />
              <div
                className="absolute inset-x-3 top-7 h-1.5 w-3/4 rounded-full opacity-60"
                style={{ background: theme.preview[2] }}
              />
              <div
                className="absolute inset-x-3 top-10 h-1.5 w-1/2 rounded-full opacity-30"
                style={{ background: theme.preview[2] }}
              />
              {selected ? (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neon-500 text-ink-950 shadow-glow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between bg-ink-800/90 px-3 py-2">
              <span className={`text-xs font-semibold ${selected ? 'text-neon-300' : 'text-fog'}`}>
                {theme.label}
              </span>
              {theme.id === 'green' ? (
                <span className="text-[10px] uppercase tracking-wider text-fog-faint">default</span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

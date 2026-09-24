import type { Config } from 'tailwindcss';

/**
 * Theming: every color token maps to a CSS custom property (RGB triplet) so
 * the whole panel can be re-skinned by swapping `[data-theme]` variables in
 * globals.css. The default (no data-theme / data-theme="green") is the
 * original black + neon-green look — untouched.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces with a faint green cast (theme-switchable)
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          750: 'rgb(var(--ink-750) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
        },
        // Shiny / neon accent (theme-switchable)
        neon: {
          200: 'rgb(var(--neon-200) / <alpha-value>)',
          300: 'rgb(var(--neon-300) / <alpha-value>)',
          400: 'rgb(var(--neon-400) / <alpha-value>)',
          500: 'rgb(var(--neon-500) / <alpha-value>)',
          600: 'rgb(var(--neon-600) / <alpha-value>)',
          700: 'rgb(var(--neon-700) / <alpha-value>)',
          800: 'rgb(var(--neon-800) / <alpha-value>)',
          900: 'rgb(var(--neon-900) / <alpha-value>)',
        },
        // Soft off-white body text (theme-switchable)
        fog: {
          DEFAULT: 'rgb(var(--fog) / <alpha-value>)',
          dim: 'rgb(var(--fog-dim) / <alpha-value>)',
          faint: 'rgb(var(--fog-faint) / <alpha-value>)',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--neon-500) / 0.35)',
        'glow-sm': '0 0 12px rgb(var(--neon-500) / 0.30)',
        'glow-lg': '0 0 48px rgb(var(--neon-500) / 0.28)',
        panel: '0 1px 0 rgb(var(--sheen-inset)) inset, 0 8px 24px var(--panel-shadow)',
      },
      backgroundImage: {
        'neon-gradient':
          'linear-gradient(135deg, rgb(var(--neon-400)) 0%, rgb(var(--neon-500)) 45%, rgb(var(--neon-600)) 100%)',
        'panel-sheen': 'linear-gradient(180deg, var(--sheen-top) 0%, transparent 28%)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 18px rgb(var(--neon-500) / 0.25)' },
          '50%': { boxShadow: '0 0 34px rgb(var(--neon-500) / 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

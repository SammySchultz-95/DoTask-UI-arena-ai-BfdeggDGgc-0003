import type { Config } from 'tailwindcss';

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
        // Near-black surfaces with a faint green cast
        ink: {
          950: '#050807',
          900: '#080D0A',
          850: '#0A100D',
          800: '#0C1310',
          750: '#0F1713',
          700: '#121C17',
          600: '#17241D',
          500: '#1E2E25',
          400: '#27392E',
        },
        // Shiny / neon green accent
        neon: {
          200: '#B8FFDD',
          300: '#7CFFC4',
          400: '#3DFFA6',
          500: '#00F58B',
          600: '#00CF75',
          700: '#00A45D',
          800: '#067A48',
          900: '#075437',
        },
        // Soft off-white body text
        fog: {
          DEFAULT: '#E6F2EA',
          dim: '#9DB4A6',
          faint: '#6E8477',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 245, 139, 0.35)',
        'glow-sm': '0 0 12px rgba(0, 245, 139, 0.30)',
        'glow-lg': '0 0 48px rgba(0, 245, 139, 0.28)',
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'neon-gradient':
          'linear-gradient(135deg, #3DFFA6 0%, #00F58B 45%, #00CF75 100%)',
        'panel-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 28%)',
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
          '0%, 100%': { boxShadow: '0 0 18px rgba(0,245,139,0.25)' },
          '50%': { boxShadow: '0 0 34px rgba(0,245,139,0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // This module *generates* Tailwind class strings for the export feature.
    // Scanning it makes the compiler mistake template literals such as
    // `translate-x-[${fmt(n('x'))}px]` for real utilities and emit broken CSS.
    '!./src/lib/tailwind.ts',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--mc-bg) / <alpha-value>)',
        panel: 'rgb(var(--mc-panel) / <alpha-value>)',
        raised: 'rgb(var(--mc-raised) / <alpha-value>)',
        edge: 'rgb(var(--mc-edge) / <alpha-value>)',
        ink: 'rgb(var(--mc-ink) / <alpha-value>)',
        mute: 'rgb(var(--mc-mute) / <alpha-value>)',
        accent: 'rgb(var(--mc-accent) / <alpha-value>)',
        accent2: 'rgb(var(--mc-accent2) / <alpha-value>)',
        key: 'rgb(var(--mc-key) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.08)',
        float: '0 12px 40px rgb(0 0 0 / 0.25)',
        glow: '0 0 0 1px rgb(var(--mc-accent) / 0.35), 0 4px 24px rgb(var(--mc-accent) / 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}

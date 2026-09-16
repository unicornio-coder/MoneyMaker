import type { Config } from 'tailwindcss';

// Tokens tomados de docs/handoff/design-tokens.json. No inventar colores.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: '#16A34A', dark: '#15803D', light: '#4ADE80', 50: '#F0FDF4', 100: '#E3EFE6', 200: '#BBF7D0', 300: '#CFE6D6', soft: '#EAF7EE' },
        lime: '#BEF264',
        ink: '#0B1F17',
        negative: { DEFAULT: '#2563EB', soft: '#DCE6F5', 50: '#E8F0FE', 100: '#D6E2F5' },
        invest: { DEFAULT: '#6366F1', soft: '#EEF2FF' },
        warning: { DEFAULT: '#F59E0B', soft: '#FFFBEB' },
        bg: { DEFAULT: '#FFFFFF', page: '#F7F8F7', muted: '#F4F6F4', input: '#F4F4F2', chip: '#F0F2F0', hover: '#FAFBFA', frame: '#E9EEEB' },
        line: { DEFAULT: '#EEF2EF', 2: '#E6ECE9', input: '#E5E7EB', grid: '#E3E8E5', dashed: '#C9D2CE', handle: '#D9E1DD', soft: '#F0F0EE' },
        txt: { DEFAULT: '#0B1F17', 2: '#5F6B67', 3: '#8A958F', inactive: '#7A8C84', muted: '#6B7A74', gray: '#6B7280', light: '#9CA3AF' },
        bank: { nu: '#820AD1', amex: '#006FCF', bbva: '#072146', gbm: '#0B1F17', bitso: '#16A34A', coppel: '#F5C400' },
        cat: { fijos: '#0B1F17', comida: '#16A34A', transporte: '#2563EB', online: '#6366F1' },
        // Semánticos que cambian con el tema (definidos en tokens.css)
        surface: 'var(--surface)',
        canvas: 'var(--canvas)',
        fg: 'var(--fg)',
        'fg-2': 'var(--fg-2)',
        edge: 'var(--edge)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
      },
      borderRadius: { pill: '999px', input: '12px', card: '14px', 'card-lg': '18px', 'card-xl': '24px', sheet: '22px', '16': '16px', '20': '20px' },
      boxShadow: {
        card: '0 1px 3px rgba(11,31,23,0.09)',
        hover: '0 6px 18px rgba(11,31,23,0.12)',
        dark: '0 6px 20px rgba(11,31,23,0.18)',
        tabbar: '0 14px 34px rgba(11,31,23,0.35)',
        green: '0 10px 24px rgba(22,163,74,0.32)',
        plus: '0 8px 20px rgba(74,222,128,0.4)',
        exceeded: '0 10px 26px rgba(11,31,23,0.25)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.2,.8,.2,1)',
        bounce: 'cubic-bezier(.34,1.56,.64,1)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        screen: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        drawer: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        rise: 'rise .35s cubic-bezier(.2,.8,.2,1) both',
        screen: 'screen .25s cubic-bezier(.2,.8,.2,1) both',
        sheet: 'sheet .25s cubic-bezier(.2,.8,.2,1) both',
        drawer: 'drawer .25s cubic-bezier(.2,.8,.2,1) both',
        fade: 'fade .2s ease-out both',
      },
      maxWidth: { main: '1264px', form: '420px', settings: '520px' },
    },
  },
  plugins: [],
};

export default config;

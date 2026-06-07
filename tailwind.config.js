/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        gold: {
          400: '#e6c068',
          500: '#d4af37',
          600: '#b8941f',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -8px rgba(112,26,117,.14)',
        '3d': '0 18px 40px -12px rgba(112,26,117,.35), 0 8px 16px -8px rgba(112,26,117,.25)',
        btn: '0 8px 20px -6px rgba(192,38,211,.55)',
        gold: '0 8px 20px -6px rgba(212,175,55,.45)',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(135deg,#d946ef 0%,#a21caf 55%,#701a75 100%)',
        'gold-grad': 'linear-gradient(135deg,#e6c068 0%,#d4af37 100%)',
        'app-bg': 'radial-gradient(1200px 600px at 100% -10%, rgba(217,70,239,.07), transparent), radial-gradient(900px 500px at -10% 110%, rgba(212,175,55,.08), transparent)',
      },
    },
  },
  plugins: [],
}

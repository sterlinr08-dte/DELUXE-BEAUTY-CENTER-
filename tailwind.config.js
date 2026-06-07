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
        card: '0 1px 2px rgba(16,24,40,.04), 0 10px 30px -10px rgba(236,72,153,.28)',
        '3d': '0 22px 45px -12px rgba(236,72,153,.45), 0 10px 18px -8px rgba(244,114,182,.38)',
        btn: '0 10px 24px -6px rgba(236,72,153,.55)',
        gold: '0 10px 24px -6px rgba(212,175,55,.5)',
        glow: '0 0 0 4px rgba(244,114,182,.18)',
      },
      backgroundImage: {
        'brand-grad': 'linear-gradient(135deg,#f472b6 0%,#ec4899 45%,#d946ef 100%)',
        'gold-grad': 'linear-gradient(135deg,#f5c869 0%,#d4af37 100%)',
        'app-bg': 'radial-gradient(1100px 600px at 100% -10%, rgba(236,72,153,.10), transparent), radial-gradient(900px 500px at -10% 110%, rgba(212,175,55,.08), transparent)',
      },
    },
  },
  plugins: [],
}

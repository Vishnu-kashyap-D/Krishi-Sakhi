/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep forest green: primary brand colour used across all pages.
        primary: {
          50: '#f0f7f1',
          100: '#dbeee0',
          200: '#b9dcc3',
          300: '#8cc39f',
          400: '#5ca677',
          500: '#3a8a59',
          600: '#276f45',
          700: '#205939',
          800: '#1b472f',
          900: '#163b28',
          950: '#0b2317',
        },
        // Harvest gold accent.
        harvest: {
          50: '#fff8eb',
          100: '#feecc7',
          200: '#fdd78a',
          300: '#fbbd4d',
          400: '#f9a524',
          500: '#e8860c',
          600: '#c86507',
          700: '#a0470a',
        },
        // Warm neutrals (soil and paper).
        soil: {
          50: '#fbf8f2',
          100: '#f4eee2',
          200: '#e8dcc6',
          300: '#d4c09d',
          700: '#6b5536',
          800: '#4a3b26',
          900: '#2e2417',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        poppins: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(22,59,40,0.04), 0 8px 24px -8px rgba(22,59,40,0.12)',
        lift: '0 2px 4px rgba(22,59,40,0.06), 0 20px 40px -12px rgba(22,59,40,0.25)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        sway: { '0%,100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
        rise: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        sway: 'sway 5s ease-in-out infinite',
        rise: 'rise 0.6s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
}

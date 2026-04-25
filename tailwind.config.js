/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#000D2E',
          900: '#001433',
          800: '#001F5B',
          700: '#002B80',
          600: '#003499',
          500: '#0040C7',
          400: '#3366D6',
          300: '#6699FF',
          200: '#99BBFF',
          100: '#CCDCFF',
          50:  '#EEF3FF',
        },
        gold: {
          DEFAULT: '#FFD700',
          50:  '#FFFDE0',
          100: '#FFF8B0',
          200: '#FFEE66',
          300: '#FFE033',
          400: '#FFD700',
          500: '#FFC200',
          600: '#E6A800',
          700: '#CC8800',
          800: '#996600',
          900: '#664400',
        },
      },
      fontFamily: {
        sans:    ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'gold-sm': '0 2px 12px rgba(255,215,0,.25)',
        'gold-md': '0 4px 24px rgba(255,215,0,.35)',
        'gold-lg': '0 8px 40px rgba(255,215,0,.45)',
        'navy-md': '0 4px 24px rgba(0,31,91,.30)',
        'navy-lg': '0 8px 48px rgba(0,31,91,.40)',
        'glass':   '0 8px 32px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.15)',
      },
      backgroundImage: {
        'navy-gradient':   'linear-gradient(135deg, #000D2E 0%, #001F5B 50%, #002B80 100%)',
        'navy-radial':     'radial-gradient(ellipse at top left, #002B80 0%, #000D2E 70%)',
        'gold-gradient':   'linear-gradient(135deg, #FFD700 0%, #FFC200 100%)',
        'gold-shine':      'linear-gradient(105deg, #FFD700 0%, #FFEE66 45%, #FFD700 55%, #FFC200 100%)',
        'hero-mesh':       'radial-gradient(at 0% 0%, #002B80 0, transparent 50%), radial-gradient(at 100% 100%, #000D2E 0, transparent 50%)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':     { transform: 'translateY(-14px) rotate(1.5deg)' },
          '66%':     { transform: 'translateY(-7px) rotate(-1deg)' },
        },
        'float-reverse': {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':     { transform: 'translateY(14px) rotate(-1.5deg)' },
          '66%':     { transform: 'translateY(7px) rotate(1deg)' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 16px rgba(255,215,0,.30)' },
          '50%':     { boxShadow: '0 0 40px rgba(255,215,0,.65), 0 0 80px rgba(255,215,0,.20)' },
        },
        'glow-text': {
          '0%,100%': { textShadow: '0 0 8px rgba(255,215,0,.40)' },
          '50%':     { textShadow: '0 0 24px rgba(255,215,0,.90), 0 0 48px rgba(255,215,0,.30)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-left': {
          '0%':   { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%':   { transform: 'scale(1)',    opacity: '.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        draw: { to: { strokeDashoffset: '0' } },
        'loading-bar': {
          '0%':   { transform: 'translateX(-100%)' },
          '50%':  { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'bounce-in': {
          '0%':   { opacity: '0', transform: 'scale(.3)' },
          '50%':  { opacity: '1', transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        float:          'float 6s ease-in-out infinite',
        'float-reverse':'float-reverse 8s ease-in-out infinite',
        glow:           'glow 2.4s ease-in-out infinite',
        'glow-text':    'glow-text 2.4s ease-in-out infinite',
        'fade-up':      'fade-up .55s cubic-bezier(.4,0,.2,1) both',
        'fade-in':      'fade-in .4s ease both',
        'slide-left':   'slide-left .5s cubic-bezier(.4,0,.2,1) both',
        'slide-right':  'slide-right .5s cubic-bezier(.4,0,.2,1) both',
        'scale-in':     'scale-in .35s cubic-bezier(.4,0,.2,1) both',
        'pulse-ring':   'pulse-ring 1.4s cubic-bezier(.4,0,.6,1) infinite',
        draw:           'draw 1.5s ease-in-out forwards',
        'loading-bar':  'loading-bar 2s ease-in-out infinite',
        'spin-slow':    'spin-slow 20s linear infinite',
        'bounce-in':    'bounce-in .8s ease both',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
        smooth: 'cubic-bezier(.4,0,.2,1)',
      },
    },
  },
  plugins: [],
};

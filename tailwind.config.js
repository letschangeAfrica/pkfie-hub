/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,css}", "./public/index.html"],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        pkfe: {
          navy:    '#0B2559',
          navyLt:  '#1A4080',
          blue:    '#2563EB',
          gold:    '#C8902A',
          goldLt:  '#F0B429',
          goldPale:'#FEF3C7',
          green:   '#1A6B3A',
          ivory:   '#FAFAF5',
          surface: '#FFFFFF',
          border:  '#E2D9C8',
          text:    '#0D1B2A',
          muted:   '#546278',
        }
      },
      boxShadow: {
        pkfe: 'var(--shadow)'
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif']
      },
      keyframes: {
        float: { 
          '0%': { transform: 'translateY(0)' }, 
          '50%': { transform: 'translateY(-6px)' }, 
          '100%': { transform: 'translateY(0)' } 
        },
        // NEW: Add these for the splash screen
        draw: {
          'to': { strokeDashoffset: '0' }
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.02)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        // NEW: Add these for the splash screen
        'draw': 'draw 1.5s ease-in-out forwards',
        'loading-bar': 'loading-bar 2s ease-in-out infinite',
        'pulse': 'pulse 2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
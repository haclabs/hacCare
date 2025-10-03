/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add custom colors if needed
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Terminal theme colors
        terminal: {
          bg: '#000000',
          sidebar: '#001100',
          text: '#00ff00',
          'text-dim': '#008800',
          'text-bright': '#00ff88',
          accent: '#88ff88',
          border: '#004400',
          hover: '#002200',
          active: '#003300',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [
    function({ addVariant }) {
      addVariant('terminal', '.terminal &');
    },
  ],
  darkMode: 'class',
}

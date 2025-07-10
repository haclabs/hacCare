/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      backgroundColor: {
        dark: {
          sidebar: '#1a1f2b',
          card: '#1e2433'
        }
      },
      colors: {
        blue: {
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
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        cyan: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        }
      }
    },
  },
  plugins: [
    // Add any plugins here if needed
  ],
  safelist: [
    // Ensure all color variants are included for both light and dark modes
    'text-blue-500', 'text-red-500', 'text-green-500', 'text-purple-500', 'text-indigo-500', 'text-teal-500',
    'border-blue-300', 'border-red-300', 'border-green-300', 'border-purple-300', 'border-indigo-300', 'border-teal-300',
    'hover:border-blue-300', 'hover:border-red-300', 'hover:border-green-300', 'hover:border-purple-300', 'hover:border-indigo-300', 'hover:border-teal-300',
    // Dark mode variants
    'dark:text-blue-400', 'dark:text-red-400', 'dark:text-green-400', 'dark:text-purple-400', 'dark:text-indigo-400', 'dark:text-teal-400',
    'dark:border-blue-600', 'dark:border-red-600', 'dark:border-green-600', 'dark:border-purple-600', 'dark:border-indigo-600', 'dark:border-teal-600',
    'dark:bg-gray-800', 'dark:bg-gray-900', 'dark:text-white', 'dark:text-gray-300', 'dark:border-gray-700'
  ]
  // Add more safelist items for dark mode
  .concat([
    'dark:bg-dark-sidebar',
    'dark:bg-dark-card',
    'dark:text-gray-100',
    'dark:text-gray-200',
    'dark:hover:bg-gray-700',
    'dark:hover:text-white'
  ])
};
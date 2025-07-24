/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#8b5cf6', // purple-500
          hover: '#7c3aed',   // purple-600
          light: '#a78bfa',   // purple-400
          dark: '#6d28d9',    // purple-700
        },
        secondary: {
          DEFAULT: '#3b82f6', // blue-500  
          hover: '#2563eb',   // blue-600
          light: '#60a5fa',   // blue-400
          dark: '#1d4ed8',    // blue-700
        },
        // Semantic colors
        danger: {
          DEFAULT: '#ef4444', // red-500
          hover: '#dc2626',   // red-600
          light: '#f87171',   // red-400
        },
        success: {
          DEFAULT: '#10b981', // emerald-500
          hover: '#059669',   // emerald-600
          light: '#34d399',   // emerald-400
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          hover: '#d97706',   // amber-600
          light: '#fbbf24',   // amber-400
        },
        // Game-specific colors
        science: {
          DEFAULT: '#3b82f6', // blue-500
          hover: '#2563eb',   // blue-600
          bg: '#1e40af20',    // blue-600/20
        },
        creative: {
          DEFAULT: '#8b5cf6', // purple-500
          hover: '#7c3aed',   // purple-600
          bg: '#7c3aed20',    // purple-600/20
        },
        // Surface colors
        surface: {
          primary: '#111827',   // gray-900
          secondary: '#1f2937', // gray-800
          tertiary: '#374151',  // gray-700
        },
        // Rarity colors for game elements
        rarity: {
          common: '#6b7280',    // gray-500
          uncommon: '#10b981',  // emerald-500
          rare: '#8b5cf6',      // purple-500
          epic: '#f59e0b',      // amber-500
          legendary: '#ef4444', // red-500
        },
      },
      // Typography scale - extending default
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      // Spacing additions (use sparingly)
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Animation extensions
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      },
      // Box shadow extensions
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-strong': '0 0 30px rgba(139, 92, 246, 0.5)',
      },
    },
  },
  plugins: [],
}

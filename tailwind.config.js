/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        surface: '#1a1a1a',
        'surface-hover': '#252525',
        border: '#2a2a2a',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        card: {
          DEFAULT: '#1a1a1a',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#1a1a1a',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fafafa',
        },
        input: '#2a2a2a',
        ring: '#6366f1',
        // Category colors
        category: {
          food: '#f97316',
          utilities: '#3b82f6',
          travel: '#22c55e',
          entertainment: '#a855f7',
          shopping: '#eab308',
          health: '#ef4444',
          education: '#06b6d4',
          miscellaneous: '#737373',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.5' },
          '100%': { transform: 'scale(0.95)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

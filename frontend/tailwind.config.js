/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Clean Light Enterprise Palette (Duck Creek / Modern SaaS style)
        surface: {
          base: '#f8fafc',      // clean slate-50 page background
          card: '#ffffff',      // pure crisp white card
          elevated: '#f1f5f9',  // light slate-100 hover/elevated
          border: '#e2e8f0',    // subtle crisp border
          borderHover: '#cbd5e1',
        },
        bg: {
          app: '#f8fafc',
          sidebar: '#ffffff',
          card: '#ffffff',
          'card-hover': '#f8fafc',
          input: '#ffffff',
          subtle: '#f1f5f9',
        },
        border: {
          subtle: '#e2e8f0',
          hover: '#cbd5e1',
          focus: '#2563eb',
        },
        text: {
          primary: '#0f172a',   // slate-900 dark crisp readable
          secondary: '#334155', // slate-700
          muted: '#64748b',     // slate-500
          dim: '#94a3b8',       // slate-400
          main: '#0f172a',
        },
        brand: {
          primary: '#2563eb',
          primaryHover: '#1d4ed8',
          secondary: '#0284c7',
        },
        accent: {
          primary: '#2563eb',
          'primary-hover': '#1d4ed8',
          emerald: '#059669',
          amber: '#d97706',
          rose: '#e11d48',
          cyan: '#0284c7',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}

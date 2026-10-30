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
        console: {
          bg: '#f1f5f9',
          panel: '#ffffff',
          card: '#ffffff',
          hover: '#f8fafc',
          border: '#cbd5e1',
          borderLight: '#94a3b8',
          muted: '#64748b',
          text: '#1e293b',
          heading: '#0f172a',
        },
        emergency: {
          DEFAULT: '#b91c1c',
          bg: '#fef2f2',
          border: '#fca5a5',
          text: '#991b1b'
        },
        traffic: {
          DEFAULT: '#1d4ed8',
          bg: '#eff6ff',
          border: '#93c5fd',
          text: '#1e40af'
        },
        delivered: {
          DEFAULT: '#047857',
          bg: '#ecfdf5',
          border: '#6ee7b7',
          text: '#065f46'
        },
        congested: {
          DEFAULT: '#b45309',
          bg: '#fffbeb',
          border: '#fcd34d',
          text: '#92400e'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '3px',
        md: '5px',
        lg: '6px',
        xl: '8px'
      }
    },
  },
  plugins: [],
}

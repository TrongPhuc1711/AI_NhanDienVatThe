/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        animation: {
          // Dùng trong CameraView.jsx (badge LIVE) và App.jsx (chip FPS)
          'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          // Dùng trong AlertLog.jsx và StatsPanel.jsx
          'slide-in': 'slideIn 0.2s ease-out',
        },
        keyframes: {
          slideIn: {
            '0%':   { opacity: '0', transform: 'translateY(-6px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
        },
      },
    },
    plugins: [],
  }
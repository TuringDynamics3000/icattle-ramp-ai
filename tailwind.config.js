/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Using slate as base for dark theme
        slate: {
          950: '#0a0f1a',
        },
      },
    },
  },
  plugins: [],
}

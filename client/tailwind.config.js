/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gorbagana': {
          'dark': '#1a4a2e',
          'green': '#27ae60',
          'light': '#2ecc71',
          'accent': '#f39c12'
        }
      }
    },
  },
  plugins: [],
}
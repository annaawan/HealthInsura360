/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#faf5f5',
          100: '#f5ebeb',
          200: '#e6d1d1',
          300: '#d6b7b7',
          400: '#b87d7d',
          500: '#9a4343',
          600: '#7d2d2d',
          700: '#6a2424',
          800: '#571d1d',
          900: '#4a1818',
        }
      }
    },
  },
  plugins: [],
}

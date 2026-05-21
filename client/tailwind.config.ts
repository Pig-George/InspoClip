/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          cream: '#fef7ed',
          card: '#faf0e0',
          accent: '#d4875e',
          text: '#5c3d2e',
        },
        'amber-dark': {
          bg: '#1a1510',
          card: '#2d2218',
          accent: '#e8a87c',
          text: '#e0d0c0',
        },
      },
      fontFamily: {
        handwriting: ['Gaegu', 'Caveat', 'Kalam', 'cursive'],
        term: ['Kalam', 'Gaegu', 'cursive'],
        heading: ['Caveat', 'Gaegu', 'cursive'],
      },
    },
  },
  plugins: [],
}

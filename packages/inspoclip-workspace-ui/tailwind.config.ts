/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{js,ts,jsx,tsx}', '../client/src/**/*.{js,ts,jsx,tsx}', '../extension/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        card: {
          DEFAULT: 'var(--card)',
          alt: 'var(--card-alt)'
        },
        accent: 'var(--accent)',
        muted: 'var(--muted)',
        ink: 'var(--ink)'
      },
      fontFamily: {
        handwriting: ['Gaegu', 'Caveat', 'Kalam', 'cursive'],
        term: ['Kalam', 'Gaegu', 'cursive'],
        heading: ['Caveat', 'Gaegu', 'cursive']
      }
    }
  },
  plugins: []
}

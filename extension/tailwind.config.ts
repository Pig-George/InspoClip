/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', ':root.dark', ':root.timeline-dark'],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './contents/**/*.{ts,tsx}',
    './tabs/**/*.{ts,tsx}',
    './popup.tsx',
    './background.ts',
    './offscreen.ts',
    './node_modules/@inspoclip/workspace-ui/src/**/*.{js,ts,jsx,tsx}'
  ],
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

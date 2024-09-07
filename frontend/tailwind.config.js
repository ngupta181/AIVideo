/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#5865f2',
          dark: '#7289da',
        },
        background: {
          light: '#ffffff',
          dark: '#36393f',
        },
        text: {
          light: '#2e3338',
          dark: '#dcddde',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};



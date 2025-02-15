/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        throne: {
          gold: '#c0a062',
          goldHover: '#d4b475',
          dark: '#1a1d24',
          gray: '#2a2e37',
          grayHover: '#3a3e47',
        },
      },
    },
  },
  plugins: [],
};
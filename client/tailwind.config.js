/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          red: '#ED1B1B',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
      },
      borderColor: {
        DEFAULT: '#e5e7eb',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#0b0f14',
          panel: '#121821',
          border: '#232c38',
          accent: '#3ddc97',
        },
      },
    },
  },
  plugins: [],
};

export default config;

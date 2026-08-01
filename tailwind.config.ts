import type { Config } from 'tailwindcss';

// Brand tokens from BRAND.md: deep navy primary, herb green accent.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1C3B', light: '#16294F', soft: '#24365C' },
        herb: { DEFAULT: '#4CAF50', dark: '#2E7D32', soft: '#E8F5E9' },
      },
    },
  },
  plugins: [],
};
export default config;

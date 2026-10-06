import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dhauladhar slate-blue, anchored on the header navy (900).
        // 600 is the button/link shade: 6.7:1 on white.
        brand: {
          50: '#f3f7fc', 100: '#e3ecf7', 200: '#c5d7ed', 300: '#98b8dd',
          400: '#6896ca', 500: '#3a74b6', 600: '#2b5d97', 700: '#244c7a',
          800: '#20456f', 900: '#1e3a5f', 950: '#102032',
        },
        // Saffron accent, one hue throughout (Tailwind's default orange would
        // otherwise fill the shades we don't set). White text needs 600+ for AA.
        orange: {
          50: '#fff4f0', 100: '#fee5dc', 200: '#fdc8b5', 300: '#faa485',
          400: '#f47e52', 500: '#ee5a24', 600: '#cf4817', 700: '#a83c15',
          800: '#843315', 900: '#672a14', 950: '#391609',
        },
        success: { 500: '#00b894' },
      },
      fontFamily: {
        // --font-deva is only set on Hindi pages; elsewhere the fallback applies.
        heading: ['var(--font-heading)', 'var(--font-deva, system-ui)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'var(--font-deva, system-ui)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

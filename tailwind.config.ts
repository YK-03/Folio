import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS configuration.
 *
 * TODO:
 * - Extend the `theme` section with custom colors, fonts, spacing, etc.
 * - Add any Tailwind plugins you need (e.g. @tailwindcss/typography, @tailwindcss/forms).
 * - Configure `darkMode` if you plan to support a dark theme ('class' or 'media').
 */
const config: Config = {
  // Paths Tailwind should scan for class names to include in the final CSS bundle.
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // darkMode: 'class',  // Uncomment to enable class-based dark mode

  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-body)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        serif: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        ink: '#20211f',
        'ink-muted': '#747770',
        'ink-subtle': '#8b8d86',
        'ink-faint': '#a0a39c',
        accent: '#b35a35',
        'accent-dark': '#8d4225',
      },
      fontSize: {
        'display-hero': [
          'clamp(3.5rem, 6vw, 4rem)',
          { lineHeight: '1.05', letterSpacing: '-.045em', fontWeight: '500' },
        ],
        'display-section': [
          'clamp(2rem, 3vw, 2.5rem)',
          { lineHeight: '1.12', letterSpacing: '-.035em', fontWeight: '500' },
        ],
        'display-card': [
          '1.25rem',
          { lineHeight: '1.25', letterSpacing: '-.025em', fontWeight: '500' },
        ],
        'body-base': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label-ui': ['.875rem', { lineHeight: '1.45', fontWeight: '500' }],
        'label-eyebrow': [
          '.75rem',
          { lineHeight: '1.5', letterSpacing: '.04em', fontWeight: '500' },
        ],
        'meta-text': ['.75rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
    },
  },

  plugins: [
    // TODO: Add Tailwind plugins here, e.g.:
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/forms'),
  ],
};

export default config;

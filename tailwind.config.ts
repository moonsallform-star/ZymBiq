import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--zymbiq-primary)',
          foreground: 'var(--zymbiq-text-inverse)',
        },
        secondary: {
          DEFAULT: 'var(--zymbiq-secondary)',
          foreground: 'var(--zymbiq-text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--zymbiq-accent)',
          foreground: 'var(--zymbiq-text-inverse)',
        },
        background: 'var(--zymbiq-bg)',
        surface: {
          DEFAULT: 'var(--zymbiq-surface)',
          foreground: 'var(--zymbiq-text)',
        },
        border: 'var(--zymbiq-border)',
        foreground: 'var(--zymbiq-text)',
        muted: {
          DEFAULT: 'var(--zymbiq-muted)',
          foreground: 'var(--zymbiq-muted)',
        },
        success: 'var(--zymbiq-success)',
        warning: 'var(--zymbiq-warning)',
        error: 'var(--zymbiq-error)',
        info: 'var(--zymbiq-info)',
        // shadcn/ui compatibility aliases
        card: {
          DEFAULT: 'var(--zymbiq-surface)',
          foreground: 'var(--zymbiq-text)',
        },
        popover: {
          DEFAULT: 'var(--zymbiq-surface)',
          foreground: 'var(--zymbiq-text)',
        },
        destructive: {
          DEFAULT: 'var(--zymbiq-error)',
          foreground: 'var(--zymbiq-text-inverse)',
        },
        input: 'var(--zymbiq-border)',
        ring: 'var(--zymbiq-accent)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--zymbiq-radius)',
        none: '0px',
        sm: 'calc(var(--zymbiq-radius) - 2px)',
        md: 'var(--zymbiq-radius)',
        lg: 'calc(var(--zymbiq-radius) + 2px)',
        xl: 'calc(var(--zymbiq-radius) + 6px)',
        '2xl': 'calc(var(--zymbiq-radius) + 10px)',
        full: '9999px',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.625' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.25' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.25' }],
        '5xl': ['3rem', { lineHeight: '1.25' }],
        '6xl': ['3.75rem', { lineHeight: '1.15' }],
        '7xl': ['4.5rem', { lineHeight: '1.1' }],
      },
      spacing: {
        // 8-point grid system extras beyond Tailwind defaults
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.3333%)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.7' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        // shadcn/ui required keyframes
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        ticker: 'ticker 30s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.3s ease-out forwards',
        // shadcn/ui required animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 10px 30px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
        'tilt': '0 20px 60px -10px rgb(0 0 0 / 0.15)',
        'hub': '0 8px 32px -4px rgb(0 0 0 / 0.2)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--zymbiq-text)',
            a: {
              color: 'var(--zymbiq-accent)',
              '&:hover': {
                color: 'var(--zymbiq-accent)',
              },
            },
            'h1, h2, h3, h4': {
              color: 'var(--zymbiq-text)',
              fontFamily: 'var(--font-heading)',
            },
            code: {
              backgroundColor: 'var(--zymbiq-surface)',
              borderRadius: '4px',
              padding: '0.2em 0.4em',
            },
            blockquote: {
              borderLeftColor: 'var(--zymbiq-accent)',
              color: 'var(--zymbiq-muted)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FD',
        primary: {
          DEFAULT: '#5145E5',
          hover: '#4338CA',
          light: '#EEEBFF',
          dark: '#3730A3',
        },
        lavender: {
          50: '#F5F3FF',
          100: '#EEEBFF',
          200: '#DDD6FE',
          300: '#C4B5FD',
        },
        text: {
          main: '#111827',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#F1F5F9',
          focus: '#5145E5',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#ECFDF5',
          text: '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
          text: '#B45309',
        },
        danger: {
          DEFAULT: '#F43F5E',
          light: '#FFF1F2',
          text: '#BE123C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'sm': ['0.9375rem', { lineHeight: '1.4rem' }],
        'base': ['1.0625rem', { lineHeight: '1.625rem' }],
        'lg': ['1.1875rem', { lineHeight: '1.75rem' }],
        'xl': ['1.3125rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5625rem', { lineHeight: '2.125rem' }],
        '3xl': ['1.9375rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.375rem', { lineHeight: '2.625rem' }],
      },
      borderRadius: {
        'card': '14px',
        'subtle': '10px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 8px 24px -4px rgba(81, 69, 229, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'subtle': '0 1px 2px rgba(16, 24, 40, 0.05)',
        'dropdown': '0 10px 38px -10px rgba(22, 23, 24, 0.15), 0 10px 20px -15px rgba(22, 23, 24, 0.08)',
        'modal': '0 20px 48px -8px rgba(17, 24, 39, 0.18)',
      },
    },
  },
  plugins: [],
}

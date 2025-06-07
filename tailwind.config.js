/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A2463',
          50: '#E6EBF4',
          100: '#CCD7E9',
          200: '#99AFD3',
          300: '#6687BD',
          400: '#335FA7',
          500: '#0A2463',
          600: '#091D50',
          700: '#07173C',
          800: '#051128',
          900: '#020814',
        },
        secondary: {
          DEFAULT: '#FFBA08',
          50: '#FFF3D9',
          100: '#FFE7B5',
          200: '#FFD16D',
          300: '#FFBA25',
          400: '#FFBA08',
          500: '#DC9F00',
          600: '#B88500',
          700: '#936A00',
          800: '#6F5000',
          900: '#4A3500',
        },
        neutral: {
          DEFAULT: '#5E6973',
          50: '#F2F3F5',
          100: '#E5E7EA',
          200: '#CCD0D5',
          300: '#B2B9C0',
          400: '#99A2AB',
          500: '#5E6973',
          600: '#4A5259',
          700: '#353C40',
          800: '#212528',
          900: '#0D0E10',
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'highlight': 'highlight 2s ease-out',
      },
      boxShadow: {
        'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      spacing: {
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            'ul, ol': {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            blockquote: {
              borderLeftColor: '#0A2463',
              backgroundColor: '#F8FAFC',
              padding: '1em',
              marginTop: '1em',
              marginBottom: '1em',
            },
            code: {
              backgroundColor: '#F1F5F9',
              padding: '0.2em 0.4em',
              borderRadius: '0.25em',
              fontSize: '0.875em',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ep: {
          base:            '#0d0d0d',
          surface:         '#1a1a1a',
          raised:          '#262626',
          overlay:         '#333333',
          accent:          '#aaff00',
          'accent-light':  '#ccff66',
          'accent-subtle': '#eeffb3',
          'accent-dark':   '#88cc00',
          primary:         '#f7fff0',
          secondary:       '#b3b3b3',
          muted:           '#666666',
          'border-subtle': '#2a2a2a',
          'border-default':'#3d3d3d',
          success:         '#aaff00',
          warning:         '#ffaa00',
          danger:          '#ff4444',
          info:            '#4488ff',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '1.4' }],
        sm:   ['13px', { lineHeight: '1.5' }],
        md:   ['15px', { lineHeight: '1.6' }],
        lg:   ['18px', { lineHeight: '1.5' }],
        xl:   ['24px', { lineHeight: '1.3' }],
        '2xl':['32px', { lineHeight: '1.2' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

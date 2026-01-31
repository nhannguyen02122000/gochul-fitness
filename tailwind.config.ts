/* eslint-disable import/no-anonymous-default-export */
export default {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FA6868',
          50: '#FEF3F3',
          100: '#FEE7E7',
          200: '#FDCFCF',
          300: '#FBB7B7',
          400: '#FA9F9F',
          500: '#FA6868',
          600: '#F83E3E',
          700: '#F61414',
          800: '#C40F0F',
          900: '#920B0B'
        },
        secondary: {
          DEFAULT: '#FAAC68',
          50: '#FEF7F0',
          100: '#FEEEE1',
          200: '#FDDDC3',
          300: '#FBCDA5',
          400: '#FABC87',
          500: '#FAAC68',
          600: '#F88F3A',
          700: '#F5730C',
          800: '#C75D0A',
          900: '#994708'
        },
        accent: {
          DEFAULT: '#5A9CB5',
          50: '#EEF5F8',
          100: '#DDEBF1',
          200: '#BBD7E3',
          300: '#99C3D5',
          400: '#77AFC7',
          500: '#5A9CB5',
          600: '#4A8097',
          700: '#3A6479',
          800: '#2A485B',
          900: '#1A2C3D'
        },
        warning: {
          DEFAULT: '#FACE68',
          50: '#FEF9F0',
          100: '#FEF4E1',
          200: '#FDE9C3',
          300: '#FBDEA5',
          400: '#FAD687',
          500: '#FACE68',
          600: '#F8BD3A',
          700: '#F5AB0C',
          800: '#C7890A',
          900: '#996708'
        }
      },
      boxShadow: {
        sider: '0px 6px 12px 0px rgba(171, 190, 209, 0.30)',
        header: '0px 3px 6px 0px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  plugins: []
}

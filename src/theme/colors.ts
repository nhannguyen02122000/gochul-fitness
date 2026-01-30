/**
 * Application Theme Colors
 *
 * Color Palette:
 * - Primary (#FA6868): Main brand color - coral/red
 * - Secondary (#FAAC68): Warm complement - orange
 * - Accent (#5A9CB5): Cool contrast - blue
 * - Warning (#FACE68): Alerts and highlights - yellow
 */

export const colors = {
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
} as const

export type ColorKey = keyof typeof colors
export type ColorShade = keyof typeof colors.primary

/**
 * Application Theme Colors — Padlet Palette
 *
 * Color Palette:
 * - Primary (#F26076): Main brand color — coral
 * - Secondary (#FF9760): Warm complement — orange
 * - Accent (#458B73): Cool contrast — teal green
 * - Warning (#FFD150): Alerts and highlights — gold
 */

export const colors = {
  primary: {
    DEFAULT: '#F26076',
    50: '#FDE8EB',
    100: '#FBD1D7',
    200: '#F7A3AF',
    300: '#F47587',
    400: '#F26076',
    500: '#F26076',
    600: '#D94E63',
    700: '#BF3D51',
    800: '#962F3F',
    900: '#6D222E'
  },
  secondary: {
    DEFAULT: '#FF9760',
    50: '#FFF4EC',
    100: '#FFE9D9',
    200: '#FFD3B3',
    300: '#FFBD8D',
    400: '#FFA777',
    500: '#FF9760',
    600: '#E07A42',
    700: '#C05E28',
    800: '#96491F',
    900: '#6D3516'
  },
  accent: {
    DEFAULT: '#458B73',
    50: '#E8F5EF',
    100: '#D1EBDF',
    200: '#A3D7BF',
    300: '#75C39F',
    400: '#5AA789',
    500: '#458B73',
    600: '#38725E',
    700: '#2B594A',
    800: '#1E4035',
    900: '#112720'
  },
  warning: {
    DEFAULT: '#FFD150',
    50: '#FFFAEB',
    100: '#FFF5D6',
    200: '#FFEBAD',
    300: '#FFE085',
    400: '#FFD96A',
    500: '#FFD150',
    600: '#E0B63A',
    700: '#C09B28',
    800: '#96791F',
    900: '#6D5816'
  }
} as const

export type ColorKey = keyof typeof colors
export type ColorShade = keyof typeof colors.primary

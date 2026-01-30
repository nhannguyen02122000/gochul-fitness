import type { ThemeConfig } from 'antd'
import { Noto_Sans } from 'next/font/google'

const notoFont = Noto_Sans({ subsets: ['latin'] })


export const antdTheme: ThemeConfig = {
  token: {
    // Primary color
    colorPrimary: '#FA6868',

    // Secondary color (used for links, info states)
    colorInfo: '#FAAC68',

    // Success color
    colorSuccess: '#52c41a',

    // Warning color
    colorWarning: '#FACE68',

    // Error color
    colorError: '#ff4d4f',

    // Border and background
    colorBorder: '#d9d9d9',
    colorBgContainer: '#ffffff',

    // Typography
    fontFamily: notoFont.style.fontFamily,
    fontSize: 14,

    // Border radius
    borderRadius: 6,

    // Spacing
    controlHeight: 40,

    // Links
    colorLink: '#5A9CB5',
    colorLinkHover: '#4a8ca5',
    colorLinkActive: '#3a7c95'
  },
  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 6,
      fontWeight: 500,
      primaryShadow: '0 2px 0 rgba(250, 104, 104, 0.1)'
    },
    Input: {
      controlHeight: 40,
      borderRadius: 6
    },
    Select: {
      controlHeight: 40,
      borderRadius: 6
    },
    Card: {
      borderRadius: 8,
      boxShadow:
        '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
    },
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f5f5f5',
      siderBg: '#ffffff'
    }
  }
}

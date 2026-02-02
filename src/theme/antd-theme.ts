import type { ThemeConfig } from 'antd'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const antdTheme: ThemeConfig = {
  token: {
    // Primary color - Vibrant Coral
    colorPrimary: '#FA6868',
    colorPrimaryHover: '#FC8585',
    colorPrimaryActive: '#F83E3E',

    // Secondary color (used for links, info states)
    colorInfo: '#5A9CB5',
    colorInfoHover: '#6BADC5',
    
    // Success color
    colorSuccess: '#10b981',
    colorSuccessBg: '#d1fae5',

    // Warning color
    colorWarning: '#FAAC68',
    colorWarningBg: '#FEF7F0',

    // Error color
    colorError: '#ef4444',
    colorErrorBg: '#fee2e2',

    // Border and background
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8f9fa',
    colorBgElevated: '#ffffff',

    // Typography
    fontFamily: inter.style.fontFamily,
    fontSize: 15,
    fontSizeHeading1: 32,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',

    // Border radius - More modern
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,

    // Spacing
    controlHeight: 44,
    controlHeightLG: 52,
    controlHeightSM: 36,
    
    // Padding
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // Links
    colorLink: '#5A9CB5',
    colorLinkHover: '#6BADC5',
    colorLinkActive: '#4A8097',
    
    // Box shadows
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      controlHeight: 44,
      controlHeightLG: 52,
      controlHeightSM: 36,
      borderRadius: 12,
      borderRadiusLG: 14,
      borderRadiusSM: 10,
      fontWeight: 600,
      primaryShadow: '0 4px 12px rgba(250, 104, 104, 0.25)',
      defaultShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
      paddingContentHorizontal: 20,
    },
    Input: {
      controlHeight: 44,
      borderRadius: 12,
      paddingBlock: 10,
      paddingInline: 16,
      fontSize: 15,
    },
    InputNumber: {
      controlHeight: 44,
      borderRadius: 12,
      paddingBlock: 10,
      paddingInline: 16,
    },
    Select: {
      controlHeight: 44,
      borderRadius: 12,
      fontSize: 15,
    },
    DatePicker: {
      controlHeight: 44,
      borderRadius: 12,
    },
    Card: {
      borderRadius: 16,
      borderRadiusLG: 20,
      paddingLG: 24,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      boxShadowTertiary: '0 4px 16px rgba(0, 0, 0, 0.12)',
    },
    Modal: {
      borderRadius: 16,
      borderRadiusLG: 20,
      paddingContentHorizontal: 24,
    },
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f8f9fa',
      siderBg: '#ffffff',
    },
    Statistic: {
      titleFontSize: 14,
      contentFontSize: 28,
    },
    Tag: {
      borderRadiusSM: 8,
      defaultBg: '#f3f4f6',
      defaultColor: '#6b7280',
    },
    Badge: {
      dotSize: 8,
    },
  }
}

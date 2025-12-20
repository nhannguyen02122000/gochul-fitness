export default {
  mode: 'jit',
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#da2128', //FF8989
        background: 'var(--foreground-color)'
      },
      boxShadow: {
        sider: '0px 6px 12px 0px rgba(171, 190, 209, 0.30)',
        header: '0px 3px 6px 0px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  plugins: []
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  // Disable caching in development
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  }
}

export default nextConfig

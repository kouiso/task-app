const nextConfig = {
  env: {
    NEXT_PUBLIC_FRONTEND_ORIGIN: 'http://localhost:4000',
    NEXT_PUBLIC_API_SERVER: 'https://jsonplaceholder.typicode.com',
    NEXT_PUBLIC_SITE_NAME: 'HorseManager',
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(nextConfig)

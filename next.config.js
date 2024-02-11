const nextConfig = {
  reactStrictMode: true,
   images: {
    unoptimized: true,
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = {
  ...withBundleAnalyzer(nextConfig),
  output: 'export',
}

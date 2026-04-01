/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript設定
  typescript: {
    // ビルド時の型チェック
    tsconfigPath: './tsconfig.json',
  },

  // 画像最適化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // バンドルサイズ最適化
  compiler: {
    // SWCでReact最適化
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    removeConsole: process.env.NODE_ENV === 'production' && process.env['PLAYWRIGHT_TEST'] !== '1',
  },

  // セキュリティヘッダー
  async headers() {
    // E2Eテスト時はCSPを無効化（WebSocket/HMR接続をブロックしないため）
    const isTest = process.env['PLAYWRIGHT_TEST'] === '1';
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          ...(isTest
            ? []
            : [
                {
                  key: 'Content-Security-Policy',
                  value:
                    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;

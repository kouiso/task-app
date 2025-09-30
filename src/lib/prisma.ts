/**
 * Prisma Client Configuration
 * MySQL Docker対応の最適化された設定
 */

import { PrismaClient } from '@prisma/client'

// グローバル変数を使用してホットリロード時の接続数制限を回避
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prismaクライアント設定
 * - 開発環境：Docker MySQL（一貫性）
 * - 本番環境：Cloud MySQL（スケーラブル）
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] // 開発環境では詳細ログ
      : ['error'], // 本番環境はエラーのみ
    
    // MySQL接続プールの最適化
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// 開発環境でのみグローバルに保存（ホットリロード対応）
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Prisma接続テスト関数
 * アプリケーション起動時の接続確認用
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

/**
 * Graceful shutdown
 * アプリケーション終了時のクリーンアップ
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected gracefully')
  } catch (error) {
    console.error('❌ Error during database disconnect:', error)
  }
}
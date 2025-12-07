import { z } from 'zod';

/**
 * 環境変数のスキーマ定義
 * zodを使用して型安全に環境変数をバリデーション
 */
const envSchema = z.object({
  // データベース
  DATABASE_URL: z.string().url('DATABASE_URLは有効なURL形式である必要があります'),

  // NextAuth
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URLは有効なURL形式である必要があります'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRETは32文字以上である必要があります'),

  // JWT
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRETは32文字以上である必要があります')
    .describe('JWTのシークレットキー'),

  // アプリケーション環境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * 環境変数を検証して取得
 * 検証に失敗した場合はエラーをthrow
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      });

      throw new Error(
        `環境変数の検証に失敗しました:\n${missingVars.join('\n')}\n\n.envファイルを確認してください。`,
      );
    }
    throw error;
  }
}

/**
 * 検証済み環境変数
 * アプリケーション全体で使用する
 * ビルド時はバリデーションをスキップ（CI環境やVercelプレビューデプロイ時）
 */
const shouldSkipValidation =
  process.env['SKIP_ENV_VALIDATION'] === 'true' ||
  (process.env['NODE_ENV'] === 'production' &&
    typeof window === 'undefined' &&
    !process.env['DATABASE_URL']);

export const env = shouldSkipValidation
  ? (process.env as unknown as Env)
  : validateEnv();

/**
 * 環境変数の型定義
 */
export type Env = z.infer<typeof envSchema>;

import { z } from 'zod';

/**
 * 環境変数のスキーマ定義
 * zodを使用して型安全に環境変数をバリデーション
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URLは有効なURL形式である必要があります'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRETは32文字以上である必要があります')
    .describe('JWTのシークレットキー'),

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
const shouldSkipValidation = process.env['SKIP_ENV_VALIDATION'] === 'true';

const buildFallbackEnv = (): Env => {
  const nodeEnv = process.env['NODE_ENV'];
  const jwtSecret = process.env['JWT_SECRET'] ?? '';
  const isTestOrBuild = nodeEnv === 'test' || process.env['SKIP_ENV_VALIDATION'] === 'true';

  if (!jwtSecret && !isTestOrBuild) {
    throw new Error('JWT_SECRETが設定されていません。本番・開発環境では必須の環境変数です。');
  }

  return {
    DATABASE_URL: process.env['DATABASE_URL'] ?? '',
    JWT_SECRET: jwtSecret,
    NODE_ENV: nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development',
  };
};

export const env: Env = shouldSkipValidation ? buildFallbackEnv() : validateEnv();

/**
 * 環境変数の型定義
 */
export type Env = z.infer<typeof envSchema>;

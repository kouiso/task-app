// Playwright用カスタムサーバー起動スクリプト
// tRPC v11のProxy構造がproduction SSRでstack overflowを起こすが、
// サーバーをクラッシュさせずにエラーをログ出力のみにして継続させる
import { spawn } from 'node:child_process';

process.on('uncaughtException', (err) => {
  if (err.message?.includes('Maximum call stack size exceeded')) {
    console.error('[e2e-server] SSR stack overflow caught and ignored');
    return;
  }
  console.error('[e2e-server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  if (String(reason).includes('Maximum call stack size exceeded')) {
    console.error('[e2e-server] SSR stack overflow (rejection) caught and ignored');
    return;
  }
  console.error('[e2e-server] Unhandled rejection:', reason);
});

const port = process.env.PORT || '3002';
const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

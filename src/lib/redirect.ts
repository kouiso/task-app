/**
 * Open Redirect対策：ログイン後の遷移先が同一オリジンの相対パスかを検証する
 *
 * ログイン画面とミドルウェアの2箇所で同じ値を判定するため、片方だけ緩むことがないよう
 * 実装を1つに寄せている。
 */
export function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;

  // ブラウザのURLパーサはタブ・改行・復帰を取り除いてから解釈する。
  // `?callbackUrl=/%09/evil.example` は `/\t/evil.example` として届き、
  // 除去後は `//evil.example`（外部サイト）になる。
  if (url.includes('\t') || url.includes('\n') || url.includes('\r')) return false;

  // 円記号もブラウザの解釈ではスラッシュと同じ扱いになる
  if (url.includes('\\')) return false;

  // プロトコル相対URL（//example.com）は許可しない
  if (url.startsWith('//')) return false;

  // 相対パスのみを許可（http:// や https:// はここで落ちる）
  return url.startsWith('/');
}

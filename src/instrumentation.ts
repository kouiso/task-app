/**
 * Node.js 22+のビルトインWeb Storage APIはSSRで正常動作しない
 * getItem/setItem等がundefinedになるため、サーバー起動時に無効化する
 */
export async function register() {
  if (typeof window === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  }
}

import { describe, expect, it } from 'vitest';
import { isValidRedirectUrl } from './redirect';

describe('isValidRedirectUrl', () => {
  it('同一オリジンの相対パスを許可する', () => {
    expect(isValidRedirectUrl('/dashboard')).toBe(true);
    expect(isValidRedirectUrl('/project?id=1')).toBe(true);
  });

  it('空文字と絶対URLを拒否する', () => {
    expect(isValidRedirectUrl('')).toBe(false);
    expect(isValidRedirectUrl('https://evil.example')).toBe(false);
    expect(isValidRedirectUrl('//evil.example')).toBe(false);
  });

  it('円記号を含む値を拒否する', () => {
    // ブラウザは円記号をスラッシュとして解釈するため、外部オリジンへ抜ける
    expect(new URL('/\\evil.example', 'https://app.example').origin).toBe('https://evil.example');
    expect(isValidRedirectUrl('/\\evil.example')).toBe(false);
  });

  it('URLパーサが取り除く空白文字を含む値を拒否する', () => {
    // タブは解釈前に取り除かれ、残りが //evil.example になる
    expect(new URL('/\t/evil.example', 'https://app.example').origin).toBe('https://evil.example');
    expect(isValidRedirectUrl('/\t/evil.example')).toBe(false);
    expect(isValidRedirectUrl('/\n/evil.example')).toBe(false);
    expect(isValidRedirectUrl('/\r/evil.example')).toBe(false);
  });
});

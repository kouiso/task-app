import { describe, expect, it } from 'vitest';
import { BCRYPT_PASSWORD_MAX_BYTES, isPasswordWithinBcryptLimit } from './password';

const boundaries = [
  ['ASCII', `Aa1!${'x'.repeat(68)}`, `Aa1!${'x'.repeat(69)}`],
  ['日本語', `Aa1!${'あ'.repeat(22)}xx`, `Aa1!${'あ'.repeat(22)}xxx`],
  ['絵文字', `Aa1!${'😀'.repeat(17)}`, `Aa1!${'😀'.repeat(17)}x`],
  ['単独サロゲート', `Aa1!${'x'.repeat(65)}\uD800`, `Aa1!${'x'.repeat(65)}\uD800x`],
] as const;

describe('bcrypt password byte limit', () => {
  it.each(boundaries)('%sの72バイトを受け入れ、73バイトを拒否する', (_kind, atLimit, over) => {
    expect(new TextEncoder().encode(atLimit)).toHaveLength(BCRYPT_PASSWORD_MAX_BYTES);
    expect(new TextEncoder().encode(over)).toHaveLength(BCRYPT_PASSWORD_MAX_BYTES + 1);
    expect(isPasswordWithinBcryptLimit(atLimit)).toBe(true);
    expect(isPasswordWithinBcryptLimit(over)).toBe(false);
  });
});

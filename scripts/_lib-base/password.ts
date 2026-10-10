import { z } from 'zod';

export const BCRYPT_PASSWORD_MAX_BYTES = 72;

export const isPasswordWithinBcryptLimit = (password: string): boolean =>
  new TextEncoder().encode(password).byteLength <= BCRYPT_PASSWORD_MAX_BYTES;

export const createPasswordSchema = (minimumLengthMessage: string) =>
  z
    .string()
    .min(8, minimumLengthMessage)
    .regex(/[A-Z]/, 'パスワードには大文字を含める必要があります')
    .regex(/[a-z]/, 'パスワードには小文字を含める必要があります')
    .regex(/[0-9]/, 'パスワードには数字を含める必要があります')
    .regex(/[^A-Za-z0-9]/, 'パスワードには特殊文字を含める必要があります')
    .refine(isPasswordWithinBcryptLimit, 'パスワードはUTF-8で72バイト以内にしてください');

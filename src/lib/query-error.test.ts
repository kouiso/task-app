import { describe, expect, it } from 'vitest';
import {
  httpStatusOf,
  isAuthError,
  isForbiddenError,
  isUnknownResult,
  shouldRetryQuery,
} from './query-error';

describe('httpStatusOf', () => {
  it('data.httpStatus を返す', () => {
    expect(httpStatusOf({ data: { httpStatus: 401 } })).toBe(401);
  });

  it('data が無いエラーは null', () => {
    expect(httpStatusOf({})).toBeNull();
    expect(httpStatusOf({ data: null })).toBeNull();
    expect(httpStatusOf(null)).toBeNull();
  });
});

describe('isAuthError / isForbiddenError', () => {
  it('401 を認証エラーと判定する', () => {
    expect(isAuthError({ data: { httpStatus: 401 } })).toBe(true);
    expect(isAuthError({ data: { httpStatus: 403 } })).toBe(false);
    expect(isAuthError({ data: { httpStatus: 500 } })).toBe(false);
  });

  it('403 を権限エラーと判定する', () => {
    expect(isForbiddenError({ data: { httpStatus: 403 } })).toBe(true);
    expect(isForbiddenError({ data: { httpStatus: 401 } })).toBe(false);
  });
});

describe('isUnknownResult', () => {
  it('構造化データが無いエラーは結果不明', () => {
    // ネットワーク断・非JSON応答は data が undefined になる
    expect(isUnknownResult({})).toBe(true);
    expect(isUnknownResult({ data: null })).toBe(true);
    expect(isUnknownResult({ data: undefined })).toBe(true);
  });

  it('構造化された tRPC エラーは結果が分かる', () => {
    expect(isUnknownResult({ data: { httpStatus: 500 } })).toBe(false);
    expect(isUnknownResult({ data: { code: 'FORBIDDEN' } })).toBe(false);
  });

  it('エラー自体が無ければ不明ではない', () => {
    expect(isUnknownResult(null)).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it.each([401, 403])('%sでは最初の失敗から再試行しない', (status) => {
    expect(shouldRetryQuery(0, { data: { httpStatus: status } })).toBe(false);
  });
  it('一時エラーの再試行にも上限がある', () => {
    expect(shouldRetryQuery(0, { data: { httpStatus: 500 } })).toBe(true);
    expect(shouldRetryQuery(3, { data: { httpStatus: 500 } })).toBe(false);
  });
});

// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateRequestId,
  getRequestIdFromHeaders,
  normalizeRequestId,
  setRequestIdHeader,
  writeStructuredLog,
} from './observability';

describe('observability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['OBSERVABILITY_LOGS'];
  });

  it('既存の安全な request id を再利用する', () => {
    expect(normalizeRequestId('req-12345678')).toBe('req-12345678');
  });

  it('不正な request id は再生成する', () => {
    const requestId = normalizeRequestId('bad header value');

    expect(requestId).not.toBe('bad header value');
    expect(requestId.length).toBeGreaterThan(8);
  });

  it('headers から request id を取得して設定できる', () => {
    const headers = new Headers({ 'x-request-id': 'trace-abcdef12' });

    expect(getRequestIdFromHeaders(headers)).toBe('trace-abcdef12');

    setRequestIdHeader(headers, 'trace-updated12');
    expect(headers.get('x-request-id')).toBe('trace-updated12');
  });

  it('request id を生成できる', () => {
    expect(generateRequestId()).toBeTypeOf('string');
  });

  it('test 環境では structured log を出力しない', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    writeStructuredLog({ event: 'test.event', requestId: 'trace-abcdef12' });

    expect(infoSpy).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequestError } from './instrumentation';

const { writeStructuredLog } = vi.hoisted(() => ({ writeStructuredLog: vi.fn() }));
vi.mock('@/lib/observability', () => ({ writeStructuredLog }));

const context: Parameters<typeof onRequestError>[2] = {
  routerKind: 'App Router',
  routePath: '/project',
  routeType: 'render',
  revalidateReason: undefined,
};

describe('onRequestError', () => {
  afterEach(() => {
    writeStructuredLog.mockReset();
  });

  it('サーバーの例外を request id 付きの error ログに残す', async () => {
    await onRequestError(
      new Error('boom'),
      { path: '/project?q=secret', method: 'GET', headers: { 'x-request-id': 'trace-abcdef12' } },
      context,
    );

    expect(writeStructuredLog).toHaveBeenCalledWith({
      level: 'error',
      event: 'http.error',
      requestId: 'trace-abcdef12',
      path: '/project',
      method: 'GET',
      routeType: 'render',
      message: 'boom',
    });
  });

  it('request id が無いときは requestId を付けずに残す', async () => {
    await onRequestError('plain failure', { path: '/api/x', method: 'POST', headers: {} }, context);

    expect(writeStructuredLog).toHaveBeenCalledWith(
      expect.not.objectContaining({ requestId: expect.anything() }),
    );
    expect(writeStructuredLog.mock.calls[0]?.[0]).toMatchObject({
      level: 'error',
      message: 'plain failure',
    });
  });
});

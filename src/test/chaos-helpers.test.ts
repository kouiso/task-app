/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createFlakyNetworkMutation, runMutationWithRetry } from './chaos-helpers';

describe('chaos test helpers', () => {
  it('retries a mutation after simulated network failure and exposes toast text', async () => {
    const toastMessages: string[] = [];
    const flakyMutation = createFlakyNetworkMutation(2, { ok: true });

    const result = await runMutationWithRetry(() => flakyMutation.mutate(), {
      retries: 2,
      onFailure: () => {
        toastMessages.push('通信に失敗しました。再試行します');
      },
    });

    expect(result).toEqual({ ok: true });
    expect(flakyMutation.attempts).toBe(3);
    expect(toastMessages).toEqual([
      '通信に失敗しました。再試行します',
      '通信に失敗しました。再試行します',
    ]);
  });
});

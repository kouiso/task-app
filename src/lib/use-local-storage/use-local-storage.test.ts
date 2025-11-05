/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useLocalStorage from './index';

describe('useLocalStorageフック', () => {
  beforeEach(() => {
    // シンプルなwindowオブジェクトと localStorage のモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('初期値が使用されること', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    // 初期値が返されることを確認
    expect(result.current[0]).toBe('initial-value');
  });
});

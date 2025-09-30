import * as React from 'react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import './icon.mocks';
import ResizeObserverMock from './mocks/resize-observer.mock';

// MSWのセットアップ
beforeAll(() => {
  // MSWのサーバーをセットアップ
});

afterAll(() => {
  // MSWのサーバーをクリーンアップ
});

// テスト用のユーティリティ関数
export interface CustomMatchers<R = unknown> {
  toHaveBeenCalledOnceWith(...args: unknown[]): R;
}

expect.extend({
  toHaveBeenCalledOnceWith(received: ReturnType<typeof vi.fn>, ...expectedArgs: unknown[]) {
    const pass =
      received.mock.calls.length === 1 &&
      JSON.stringify(received.mock.calls[0]) === JSON.stringify(expectedArgs);

    return {
      message: () => `expected ${received} to have been called once with ${expectedArgs}`,
      pass,
    };
  },
});

// テストで使用するカスタム要素の型定義
export interface CustomElements {
  [key: string]: ComponentProps<keyof JSX.IntrinsicElements>;
}

// テスト後のクリーンアップ
afterEach(() => {
  cleanup();
});

// Next.js のコンポーネントをモック
type ImageProps = ComponentProps<'img'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
};

vi.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: ImageProps) {
    return {
      type: 'img',
      props: {
        ...props,
        'data-testid': 'mock-image',
      },
    };
  },
}));

type LinkProps = ComponentProps<'a'> & {
  href: string;
  children: React.ReactNode;
};

vi.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({ href, children, ...props }: LinkProps) {
    return React.createElement('a', { href, ...props }, children);
  },
}));

// matchMediaのモック
type MediaQueryList = {
  matches: boolean;
  media: string;
  onchange: null | (() => void);
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore vitest-setup-matchmedia
global.matchMedia = vi.fn().mockImplementation(
  (query): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore vitest-setup
global.ResizeObserver = ResizeObserverMock;

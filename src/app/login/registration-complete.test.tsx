// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '../register/page';
import LoginPage from './page';

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
  registerOptions: null as null | { onSuccess?: () => void },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.params,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
vi.mock('@/trpc/react', () => ({
  api: {
    auth: {
      login: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      register: {
        useMutation: (options: { onSuccess?: () => void }) => {
          mocks.registerOptions = options;
          return { mutate: vi.fn(), isPending: false };
        },
      },
    },
  },
}));

beforeEach(() => {
  mocks.params = new URLSearchParams();
  mocks.push.mockReset();
  mocks.registerOptions = null;
});

describe('ユーザー登録完了の案内', () => {
  it('登録成功後は固定フラグ付きのログイン画面へ移る', () => {
    render(<RegisterPage />);

    act(() => mocks.registerOptions?.onSuccess?.());

    expect(mocks.push).toHaveBeenCalledWith('/login?registered=1');
  });

  it('正しい登録完了フラグだけで固定メッセージを表示する', () => {
    mocks.params = new URLSearchParams('registered=1');

    render(<LoginPage />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('登録が完了しました');
    expect(status).toHaveTextContent('ログインしてください。');
  });

  it('未知の値を登録完了として表示しない', () => {
    mocks.params = new URLSearchParams('registered=任意のメッセージ');

    render(<LoginPage />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('任意のメッセージ')).not.toBeInTheDocument();
  });
});

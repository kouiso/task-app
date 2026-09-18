// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileEditPage from './page';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  currentUser: {
    name: '利用者',
    email: 'user@example.com',
    avatar: null,
  },
  utils: {
    auth: {
      getCurrentUser: { invalidate: vi.fn() },
      getSession: { invalidate: vi.fn() },
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/trpc/react', () => ({
  api: {
    useUtils: () => mocks.utils,
    auth: {
      getCurrentUser: {
        useQuery: () => ({
          data: mocks.currentUser,
          isLoading: false,
        }),
      },
    },
    user: {
      updateProfile: {
        useMutation: () => ({
          mutate: mocks.mutate,
          isPending: false,
          error: null,
        }),
      },
    },
  },
}));

beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.push.mockReset();
  mocks.refresh.mockReset();
});

async function renderForm() {
  render(<ProfileEditPage />);
  await waitFor(() => expect(screen.getByLabelText(/^名前/)).toHaveValue('利用者'));
  const form = screen.getByRole('button', { name: '更新' }).closest('form');
  if (!form) throw new Error('プロフィール編集フォームが見つかりません');
  return form;
}

describe('プロフィール編集のアバターURL', () => {
  it('不正なURLではZodのエラーを表示して更新を送信しない', async () => {
    const form = await renderForm();
    expect(form).toHaveAttribute('novalidate');

    const avatarInput = screen.getByLabelText('アバターURL（任意）');
    fireEvent.change(avatarInput, { target: { value: 'invalid-url' } });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    expect(await screen.findByText('有効なURLを入力してください')).toBeInTheDocument();
    expect(avatarInput).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('正常なURLをそのまま更新へ送信する', async () => {
    await renderForm();
    fireEvent.change(screen.getByLabelText('アバターURL（任意）'), {
      target: { value: 'https://example.com/avatar.png' },
    });
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        name: '利用者',
        email: 'user@example.com',
        avatar: 'https://example.com/avatar.png',
      }),
    );
  });

  it('空欄はnullへ変換して更新へ送信する', async () => {
    await renderForm();
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        name: '利用者',
        email: 'user@example.com',
        avatar: null,
      }),
    );
  });
});

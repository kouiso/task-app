// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from './page';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/trpc/react', () => ({
  api: {
    auth: {
      register: {
        useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
      },
    },
  },
}));

beforeEach(() => {
  mocks.mutate.mockReset();
  mocks.push.mockReset();
});

describe('新規登録のパスワード長', () => {
  it('UTF-8で73バイトの入力を送信前に拒否する', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^名前/), '利用者');
    await user.type(screen.getByLabelText(/^メールアドレス/), 'byte-ui@example.com');
    const password = `Aa1!${'😀'.repeat(17)}x`;
    await user.type(screen.getByLabelText(/^パスワード/, { selector: '#password' }), password);
    await user.type(
      screen.getByLabelText(/^パスワード（確認）/, { selector: '#confirmPassword' }),
      password,
    );
    await user.click(screen.getByRole('button', { name: '登録' }));

    expect(await screen.findByText('パスワードはUTF-8で72バイト以内にしてください')).toBeVisible();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

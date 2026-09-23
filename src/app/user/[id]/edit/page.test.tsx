// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { TRPCError } from '@trpc/server';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserEditPage from './page';

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  redirect: mocks.redirect,
}));
vi.mock('@/trpc/server', () => ({ trpc: { user: { getById: mocks.getById } } }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('./user-edit-client', () => ({
  UserEditClient: ({ userId }: { userId: string }) => <p>{`edit:${userId}`}</p>,
}));

const props = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.getById.mockReset().mockResolvedValue({ id: 'user-1' });
  mocks.notFound.mockClear();
  mocks.redirect.mockClear();
});

describe('ユーザー編集のserver認可', () => {
  it('許可されたIDだけclientへ渡す', async () => {
    render(await UserEditPage(props('user-1')));
    expect(screen.getByText('edit:user-1')).toBeInTheDocument();
    expect(mocks.getById).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it.each([
    'existing-other',
    'missing-other',
  ])('他人の%sは存在に関係なく同じ拒否になる', async (id) => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'FORBIDDEN' }));
    render(await UserEditPage(props(id)));
    expect(screen.getByText('管理者または本人のみユーザー編集が可能です')).toBeInTheDocument();
  });

  it('許可されたNOT_FOUNDだけ404にする', async () => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'NOT_FOUND' }));
    await expect(UserEditPage(props('missing-self'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('未認証はログインへ送る', async () => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'UNAUTHORIZED' }));
    await expect(UserEditPage(props('user-1'))).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('500相当の予期しない失敗はそのまま伝播する', async () => {
    const error = new Error('database unavailable');
    mocks.getById.mockRejectedValue(error);
    await expect(UserEditPage(props('user-1'))).rejects.toBe(error);
  });
});

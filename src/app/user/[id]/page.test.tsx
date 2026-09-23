// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { TRPCError } from '@trpc/server';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserDetailPage from './page';

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
vi.mock('./user-detail-client', () => ({
  UserDetailClient: ({ userId }: { userId: string }) => <p>{`detail:${userId}`}</p>,
}));

const props = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.getById.mockReset().mockResolvedValue({ id: 'user-1' });
  mocks.notFound.mockClear();
  mocks.redirect.mockClear();
});

describe('ユーザー詳細のserver認可', () => {
  it('許可されたIDだけclientへ渡す', async () => {
    render(await UserDetailPage(props('user-1')));
    expect(screen.getByText('detail:user-1')).toBeInTheDocument();
    expect(mocks.getById).toHaveBeenCalledWith({ id: 'user-1' });
  });

  it.each([
    'existing-other',
    'missing-other',
  ])('他人の%sは存在に関係なく同じ拒否になる', async (id) => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'FORBIDDEN' }));
    render(await UserDetailPage(props(id)));
    expect(screen.getByText('このユーザーを見る権限がありません')).toBeInTheDocument();
  });

  it('許可されたNOT_FOUNDだけ404にする', async () => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'NOT_FOUND' }));
    await expect(UserDetailPage(props('missing-self'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('未認証はログインへ送る', async () => {
    mocks.getById.mockRejectedValue(new TRPCError({ code: 'UNAUTHORIZED' }));
    await expect(UserDetailPage(props('user-1'))).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('500相当の予期しない失敗はそのまま伝播する', async () => {
    const error = new Error('database unavailable');
    mocks.getById.mockRejectedValue(error);
    await expect(UserDetailPage(props('user-1'))).rejects.toBe(error);
  });
});

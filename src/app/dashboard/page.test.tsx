// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './page';

const queries = vi.hoisted(() => ({ projects: vi.fn(), overview: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: queries.push }) }));
vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/trpc/react', () => ({
  api: {
    project: { getAll: { useQuery: queries.projects } },
    report: { getOverview: { useQuery: queries.overview } },
  },
}));

function result(status?: number, data: unknown = {}) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    error: status === undefined ? null : { data: { httpStatus: status } },
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  queries.projects.mockReturnValue(result(undefined, []));
  queries.overview.mockReturnValue(result());
});

describe('ダッシュボードの取得エラー', () => {
  it('再取得の500では直前の表示を残す', () => {
    queries.overview.mockReturnValue(result(500));
    render(<DashboardPage />);
    expect(screen.getByText('全体の進捗')).toBeInTheDocument();
    expect(screen.getByText(/最新の情報を取得できませんでした/)).toBeInTheDocument();
  });

  it.each([401, 403])('キャッシュがあっても%sなら保護データを隠す', (status) => {
    queries.overview.mockReturnValue(result(status));
    render(<DashboardPage />);
    expect(screen.queryByText('全体の進捗')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        status === 401 ? 'ログインの有効期限が切れました' : 'このデータを見る権限がありません',
      ),
    ).toBeInTheDocument();
  });

  it.each([401, 403])('最初のクエリの500で別クエリの%sを隠さない', (status) => {
    queries.projects.mockReturnValue(result(500, []));
    queries.overview.mockReturnValue(result(status));
    render(<DashboardPage />);
    expect(screen.queryByText('全体の進捗')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        status === 401 ? 'ログインの有効期限が切れました' : 'このデータを見る権限がありません',
      ),
    ).toBeInTheDocument();
  });

  it('初回500を空の成功として表示しない', () => {
    queries.overview.mockReturnValue({ ...result(500), data: undefined });
    render(<DashboardPage />);
    expect(screen.queryByText('全体の進捗')).not.toBeInTheDocument();
    expect(screen.getByText('データを取得できませんでした')).toBeInTheDocument();
  });
});

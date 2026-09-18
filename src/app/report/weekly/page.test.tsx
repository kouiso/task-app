// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WeeklyReportPage from './page';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ children, data }: { children: ReactNode; data: unknown }) => (
    <div data-chart={JSON.stringify(data)}>{children}</div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Line: () => null,
  Bar: ({ dataKey, name }: { dataKey: string; name: string }) => (
    <span data-testid={`bar-${dataKey}`}>{name}</span>
  ),
}));

vi.mock('@/trpc/react', () => ({
  api: { report: { getWeeklyReport: { useQuery: mocks.query } } },
}));

const reportData = {
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-01-28T23:59:59.999Z',
  totalCompleted: 4,
  weeklyData: [
    {
      week: '1週目',
      totalCompleted: 4,
      byPriority: { LOW: 1, MEDIUM: 1, HIGH: 1, URGENT: 1 },
      byStatus: { DONE: 4, IN_PROGRESS: 0, IN_REVIEW: 0 },
    },
  ],
};

function queryResult(status?: number, data: typeof reportData | undefined = reportData) {
  return {
    data,
    isLoading: false,
    isError: status !== undefined,
    isFetching: false,
    error: status === undefined ? null : { data: { httpStatus: status } },
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.push.mockReset();
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.query.mockReturnValue(queryResult());
});

describe('週次レポートの対象期間', () => {
  it('UTCの開始日と終了日を、端末のタイムゾーンに変換せず表示する', () => {
    render(<WeeklyReportPage />);
    expect(screen.getByText('2026/01/01 - 2026/01/28')).toBeInTheDocument();
    expect(screen.getByText('対象期間（UTC）')).toBeInTheDocument();
  });
});

describe('週次レポートの取得エラー', () => {
  it('初回500を0件の成功として表示しない', () => {
    mocks.query.mockReturnValue({ ...queryResult(500), data: undefined });
    render(<WeeklyReportPage />);

    expect(screen.getByText('週次レポートを取得できませんでした')).toBeInTheDocument();
    expect(screen.queryByText('完了タスク合計')).not.toBeInTheDocument();
  });

  it('再取得の500では直前のデータと警告を表示する', () => {
    mocks.query.mockReturnValue(queryResult(500));
    render(<WeeklyReportPage />);

    expect(screen.getByText('完了タスク合計')).toBeInTheDocument();
    expect(screen.getByText(/最新の週次レポートを取得できませんでした/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it.each([
    [401, 'ログインの有効期限が切れました', 'ログイン画面へ', '/login'],
    [403, 'このレポートを見る権限がありません', 'プロジェクト一覧へ', '/project'],
  ] as const)('%sではキャッシュを隠して再取得しない', (status, message, button, route) => {
    mocks.query.mockReturnValue(queryResult(status));
    render(<WeeklyReportPage />);

    expect(screen.queryByText('完了タスク合計')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(mocks.push).toHaveBeenCalledWith(route);
    expect(mocks.refetch).not.toHaveBeenCalled();

    const retry = mocks.query.mock.calls[0][1].retry;
    expect(retry(0, { data: { httpStatus: status } })).toBe(false);
  });
});

describe('週次レポートの集計表示', () => {
  it('DONEだけのAPI結果をステータス推移と誤認させず、全優先度を表示する', () => {
    render(<WeeklyReportPage />);

    expect(screen.getByText('完了タスクの優先度別内訳')).toBeInTheDocument();
    expect(screen.getByTestId('bar-low')).toHaveTextContent('低');
    expect(screen.getByTestId('bar-medium')).toHaveTextContent('中');
    expect(screen.getAllByTestId('bar-high')).toHaveLength(2);
    expect(screen.getAllByTestId('bar-urgent')).toHaveLength(2);
    expect(screen.queryByText('ステータス別内訳')).not.toBeInTheDocument();
    expect(screen.queryByText('進行中')).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import WeeklyReportPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/component/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: () => null,
}));

vi.mock('@/trpc/react', () => ({
  api: {
    report: {
      getWeeklyReport: {
        useQuery: () => ({
          isLoading: false,
          data: {
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2026-01-28T23:59:59.999Z',
            totalCompleted: 0,
            weeklyData: [],
          },
        }),
      },
    },
  },
}));

describe('週次レポートの対象期間', () => {
  it('UTCの開始日と終了日を、端末のタイムゾーンに変換せず表示する', () => {
    render(<WeeklyReportPage />);
    expect(screen.getByText('2026/01/01 - 2026/01/28')).toBeInTheDocument();
    expect(screen.getByText('対象期間（UTC）')).toBeInTheDocument();
  });
});

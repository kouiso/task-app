'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AppLayout } from '@/component/layout/app-layout';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/component/ui/table';
import {
  isTaskPriority,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
} from '@/lib/constant/priority';
import { isTaskStatus, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/constant/status';
import { isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { api } from '@/trpc/react';

const CHART_FALLBACK_COLOR = '#9e9e9e';

export default function ReportPage() {
  const router = useRouter();
  const {
    data: overview,
    isLoading,
    isError,
    isFetching,
    error,
    refetch,
  } = api.report.getOverview.useQuery(undefined, {
    retry: shouldRetryQuery,
  });
  const authFailed = isError && isAuthError(error);
  const forbidden = isError && isForbiddenError(error);

  const statusData =
    overview?.statusData.map((entry) => ({
      ...entry,
      name: isTaskStatus(entry.key) ? TASK_STATUS_LABELS[entry.key] : entry.key,
    })) ?? [];

  const priorityData =
    overview?.priorityData.map((entry) => ({
      ...entry,
      name: isTaskPriority(entry.key) ? TASK_PRIORITY_LABELS[entry.key] : entry.key,
    })) ?? [];

  if (isLoading && !authFailed && !forbidden) {
    return <PageLoadingSpinner />;
  }

  if (authFailed || forbidden || (isError && overview == null)) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-base font-semibold text-foreground mb-2">
            {authFailed
              ? 'ログインの有効期限が切れました'
              : forbidden
                ? 'このレポートを見る権限がありません'
                : 'レポートを取得できませんでした'}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {authFailed
              ? 'もう一度ログインしてください。'
              : forbidden
                ? '権限が必要です。管理者に確認してください。'
                : '通信状況を確認して、再読み込みしてください。'}
          </p>
          <Button
            type="button"
            onClick={() => {
              if (authFailed) {
                router.push('/login');
                return;
              }
              if (forbidden) {
                router.push('/project');
                return;
              }
              void refetch();
            }}
            disabled={isFetching}
          >
            {authFailed ? 'ログイン画面へ' : forbidden ? 'プロジェクト一覧へ' : '再読み込み'}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {isError && overview != null ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
            <span>最新のレポートを取得できませんでした。表示は前回取得時の内容です。</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              再試行
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 items-start sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">レポート・統計</h1>
            <p className="text-muted-foreground">
              プロジェクトの進捗とタスクの状況を確認できます。
            </p>
          </div>
          <Link
            href="/report/weekly"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            週次レポートを見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 sm:pt-6">
              <p className="text-sm text-muted-foreground mb-1">タスク数</p>
              <p className="text-3xl font-bold">{overview?.totalTasks ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 sm:pt-6">
              <p className="text-sm text-muted-foreground mb-1">完了率</p>
              <p className="text-3xl font-bold">{overview?.completionRate ?? 0}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 sm:pt-6">
              <p className="text-sm text-muted-foreground mb-1">合計作業時間</p>
              <p className="text-3xl font-bold">
                {((overview?.totalTimeSpent ?? 0) / 60).toFixed(1)}h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 sm:pt-6">
              <p className="text-sm text-muted-foreground mb-1">平均作業時間/タスク</p>
              <p className="text-3xl font-bold">
                {((overview?.averageTimePerTask ?? 0) / 60).toFixed(1)}h
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>ステータス別タスク</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={
                            isTaskStatus(entry.key)
                              ? TASK_STATUS_COLORS[entry.key]
                              : CHART_FALLBACK_COLOR
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>優先度別タスク</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {priorityData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={
                            isTaskPriority(entry.key)
                              ? TASK_PRIORITY_COLORS[entry.key]
                              : CHART_FALLBACK_COLOR
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>プロジェクト統計</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">プロジェクト</TableHead>
                  <TableHead className="text-right">タスク数</TableHead>
                  <TableHead className="text-right">完了</TableHead>
                  <TableHead className="text-right">進捗</TableHead>
                  <TableHead className="text-right">作業時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview?.projectStats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-right">{stat.totalTasks}</TableCell>
                    <TableCell className="text-right">{stat.completedTasks}</TableCell>
                    <TableCell className="text-right">{stat.progress.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{stat.totalTimeHours.toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

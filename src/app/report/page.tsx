'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AppLayout } from '@/component/layout/app-layout';
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
import {
  isTaskStatus,
  TASK_STATUS,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from '@/lib/constant/status';
import { api } from '@/trpc/react';

const CHART_FALLBACK_COLOR = '#9e9e9e';

export default function ReportPage() {
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks ?? []) {
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, value]) => ({
      key,
      name: isTaskStatus(key) ? TASK_STATUS_LABELS[key] : key,
      value,
    }));
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks ?? []) {
      counts.set(task.priority, (counts.get(task.priority) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, value]) => ({
      key,
      name: isTaskPriority(key) ? TASK_PRIORITY_LABELS[key] : key,
      value,
    }));
  }, [tasks]);

  const totalTimeSpent = useMemo(
    () => tasks?.reduce((acc, task) => acc + (task.timeSpentMinutes ?? 0), 0) ?? 0,
    [tasks],
  );
  const averageTimePerTask = useMemo(
    () => (tasks && tasks.length > 0 ? totalTimeSpent / tasks.length : 0),
    [tasks, totalTimeSpent],
  );

  const projectStats = useMemo(
    () =>
      projects?.map((project) => {
        const projectTasks = tasks?.filter((t) => t.projectId === project.id) ?? [];
        const completedTasks = projectTasks.filter((t) => t.status === TASK_STATUS.DONE);
        const totalTime = projectTasks.reduce((acc, t) => acc + (t.timeSpentMinutes ?? 0), 0);
        const progress =
          projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

        return {
          id: project.id,
          name: project.name,
          totalTasks: projectTasks.length,
          completedTasks: completedTasks.length,
          progress: progress.toFixed(1),
          totalTimeHours: (totalTime / 60).toFixed(1),
        };
      }),
    [projects, tasks],
  );

  const completionRate = useMemo(
    () =>
      tasks && tasks.length > 0
        ? (
            (tasks.filter((t) => t.status === TASK_STATUS.DONE).length / tasks.length) *
            100
          ).toFixed(1)
        : '0',
    [tasks],
  );

  if (tasksLoading || projectsLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">タスク数</p>
              <p className="text-3xl font-bold">{tasks?.length ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">完了率</p>
              <p className="text-3xl font-bold">{completionRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">合計作業時間</p>
              <p className="text-3xl font-bold">{(totalTimeSpent / 60).toFixed(1)}h</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">平均作業時間/タスク</p>
              <p className="text-3xl font-bold">{(averageTimePerTask / 60).toFixed(1)}h</p>
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
            <Table>
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
                {projectStats?.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-right">{stat.totalTasks}</TableCell>
                    <TableCell className="text-right">{stat.completedTasks}</TableCell>
                    <TableCell className="text-right">{stat.progress}%</TableCell>
                    <TableCell className="text-right">{stat.totalTimeHours}h</TableCell>
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

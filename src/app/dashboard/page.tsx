'use client';

import {
  ArrowRight,
  CheckCircle,
  ClipboardList,
  Clock,
  FolderOpen,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { Badge } from '@/component/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import { Progress } from '@/component/ui/progress';
import { getPriorityBadgeVariant, getStatusBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { TASK_STATUS, TASK_STATUS_LABELS } from '@/lib/constant/status';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  const totalProjects = projects?.length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === TASK_STATUS.DONE).length ?? 0;
  const inProgressTasks = tasks?.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      title: 'プロジェクト数',
      value: totalProjects,
      icon: FolderOpen,
      gradient: 'from-blue-500/15 to-blue-600/5',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'タスク数',
      value: totalTasks,
      icon: ClipboardList,
      gradient: 'from-violet-500/15 to-violet-600/5',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
      borderColor: 'border-violet-500/20',
    },
    {
      title: '完了タスク',
      value: completedTasks,
      icon: CheckCircle,
      gradient: 'from-emerald-500/15 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: '進行中',
      value: inProgressTasks,
      icon: Clock,
      gradient: 'from-amber-500/15 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-500/20',
    },
  ];

  const recentTasks = tasks?.slice(0, 5) ?? [];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground mt-1">プロジェクトとタスクの概要</p>
        </div>

        {/* 統計カード */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={cn('bg-gradient-to-br border', stat.gradient, stat.borderColor)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn('rounded-lg p-2', stat.iconBg)}>
                    <Icon className={cn('h-4 w-4', stat.iconColor)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 完了率 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">全体の完了率</span>
              </div>
              <span className="text-2xl font-bold">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedTasks} / {totalTasks} タスク完了
            </p>
          </CardContent>
        </Card>

        {/* プロジェクト & タスク */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 最近のプロジェクト */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最近のプロジェクト</CardTitle>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => router.push('/project')}
              >
                すべて表示
                <ArrowRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => {
                    const taskCount = project.tasks?.length ?? 0;
                    const doneCount =
                      project.tasks?.filter((t) => t.status === TASK_STATUS.DONE).length ?? 0;
                    const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

                    return (
                      <button
                        key={project.id}
                        type="button"
                        className="group w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-all hover:shadow-sm"
                        onClick={() => router.push(`/project?projectId=${project.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
                              style={{
                                backgroundColor: project.color,
                                boxShadow: `0 0 8px ${project.color}40`,
                              }}
                            />
                            <span className="font-medium text-sm group-hover:text-primary transition-colors">
                              {project.name}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {doneCount} / {taskCount} タスク完了
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">プロジェクトがありません</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 最近のタスク */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">最近のタスク</CardTitle>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => router.push('/task')}
              >
                すべて表示
                <ArrowRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent>
              {recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="group w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-all hover:shadow-sm"
                      onClick={() => router.push(`/task?taskId=${task.id}`)}
                    >
                      <span className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={getStatusBadgeVariant(task.status)}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {TASK_STATUS_LABELS[task.status] ?? task.status}
                        </Badge>
                        <Badge
                          variant={getPriorityBadgeVariant(task.priority)}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">タスクがありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

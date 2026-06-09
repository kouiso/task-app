'use client';

import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Eye,
  FolderKanban,
  ListChecks,
  Timer,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import { TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { TASK_STATUS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/constant/status';
import { api } from '@/trpc/react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: overview, isLoading: overviewLoading } = api.report.getOverview.useQuery();

  if (projectsLoading || overviewLoading) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  const totalProjects = overview?.totalProjects ?? projects?.length ?? 0;
  const completedTasks = overview?.completedTasks ?? 0;
  const inProgressTasks = overview?.inProgressTasks ?? 0;
  const inReviewTasks = overview?.inReviewTasks ?? 0;
  const todoTasks = overview?.todoTasks ?? 0;
  const completionRate = overview?.completionRate ?? 0;

  const recentTasks = overview?.recentTasks ?? [];

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* ヒーローセクション — 完了率が主役 */}
        <div className="rounded-2xl border border-border/50 bg-card p-8">
          <p className="text-sm font-medium text-muted-foreground mb-1">全体の進捗</p>
          <div className="flex items-end gap-3 mb-6">
            <span className="text-6xl font-extrabold text-foreground tracking-tighter leading-none">
              {completionRate}
            </span>
            <span className="text-2xl font-bold text-muted-foreground mb-1">%</span>
          </div>

          {/* プログレスバー */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted mb-4">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>

          {/* ミニ統計 */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[TASK_STATUS.DONE] }}
              />
              <span className="text-sm text-muted-foreground">
                完了タスク <span className="font-semibold text-foreground">{completedTasks}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[TASK_STATUS.IN_PROGRESS] }}
              />
              <span className="text-sm text-muted-foreground">
                進行中タスク{' '}
                <span className="font-semibold text-foreground">{inProgressTasks}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[TASK_STATUS.IN_REVIEW] }}
              />
              <span className="text-sm text-muted-foreground">
                レビュー中タスク{' '}
                <span className="font-semibold text-foreground">{inReviewTasks}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[TASK_STATUS.TODO] }}
              />
              <span className="text-sm text-muted-foreground">
                未対応タスク <span className="font-semibold text-foreground">{todoTasks}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 統計カード — 控えめに、左ボーダーで色のアクセント */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'プロジェクト', value: totalProjects, color: '#3b82f6', icon: FolderKanban },
            { label: '未対応タスク', value: todoTasks, color: '#64748b', icon: Circle },
            { label: '完了タスク', value: completedTasks, color: '#34d399', icon: CheckCircle2 },
            { label: '進行中タスク', value: inProgressTasks, color: '#60a5fa', icon: Timer },
            { label: 'レビュー中タスク', value: inReviewTasks, color: '#fbbf24', icon: Eye },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4"
                style={{ borderLeft: `3px solid ${stat.color}` }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                  style={{ backgroundColor: `${stat.color}12` }}
                >
                  <Icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* プロジェクト & タスク */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' }}
        >
          {/* 最近のプロジェクト */}
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">プロジェクト</h2>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => router.push('/project')}
              >
                すべて
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {projects && projects.length > 0 ? (
              <div className="space-y-1">
                {projects.slice(0, 5).map((project) => {
                  // キャンセル済みは進捗の母数に含めない（アクティブな4ステータスのみを総数とする）。
                  // 総数と完了数を1回のループで同時に集計する。
                  let taskCount = 0;
                  let doneCount = 0;
                  for (const t of project.tasks ?? []) {
                    if (t.status === TASK_STATUS.CANCELLED) continue;
                    taskCount++;
                    if (t.status === TASK_STATUS.DONE) doneCount++;
                  }
                  const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/project?projectId=${project.id}`)}
                    >
                      <div
                        className="rounded-full"
                        style={{
                          backgroundColor: project.color,
                          width: '4px',
                          height: '32px',
                          flexShrink: 0,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium truncate">{project.name}</span>
                          <span className="text-xs tabular-nums text-muted-foreground ml-3">
                            {doneCount}/{taskCount}
                          </span>
                        </div>
                        <div
                          className="overflow-hidden rounded-full"
                          style={{
                            height: '4px',
                            width: '100%',
                            backgroundColor: 'hsl(var(--muted))',
                          }}
                        >
                          <div
                            className="rounded-full transition-all duration-500"
                            style={{
                              height: '4px',
                              width: `${progress}%`,
                              backgroundColor: project.color,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FolderKanban className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">プロジェクトがありません</p>
              </div>
            )}
          </div>

          {/* 最近のタスク */}
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">最近のタスク</h2>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => router.push('/task')}
              >
                すべて
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {recentTasks.length > 0 ? (
              <div className="space-y-1">
                {recentTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/task?taskId=${task.id}`)}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: '10px',
                        height: '10px',
                        flexShrink: 0,
                        backgroundColor: TASK_STATUS_COLORS[task.status],
                        boxShadow: `0 0 6px ${TASK_STATUS_COLORS[task.status]}50`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: TASK_STATUS_COLORS[task.status] }}
                        >
                          {TASK_STATUS_LABELS[task.status] ?? task.status}
                        </span>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: TASK_PRIORITY_COLORS[task.priority] }}
                        >
                          {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ListChecks className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">タスクがありません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

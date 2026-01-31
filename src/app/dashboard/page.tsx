'use client';

import { AppLayout } from '@/component/layout/app-layout';
import { Badge } from '@/component/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Skeleton } from '@/component/ui/skeleton';
import { api } from '@/trpc/react';
import { CheckCircle, ClipboardList, Clock, FolderOpen } from 'lucide-react';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalProjects = projects?.length || 0;
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length || 0;
  const inProgressTasks = tasks?.filter((t) => t.status === 'IN_PROGRESS').length || 0;

  const stats = [
    {
      title: 'Total Projects',
      value: totalProjects,
      icon: FolderOpen,
      color: 'text-blue-500',
    },
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: ClipboardList,
      color: 'text-purple-500',
    },
    {
      title: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'In Progress',
      value: inProgressTasks,
      icon: Clock,
      color: 'text-orange-500',
    },
  ];

  const recentTasks = tasks?.slice(0, 5) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Projects and Tasks */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.slice(0, 5).map((project) => {
                    const taskCount = project.tasks?.length || 0;
                    const doneCount = project.tasks?.filter((t) => t.status === 'DONE').length || 0;
                    const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

                    return (
                      <button
                        key={project.id}
                        type="button"
                        className="pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors w-full text-left"
                        onClick={() => router.push(`/project?projectId=${project.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="font-medium">{project.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {doneCount} / {taskCount} tasks completed ({progress.toFixed(0)}%)
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No projects yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="pb-4 border-b last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors w-full text-left"
                      onClick={() => router.push(`/task?taskId=${task.id}`)}
                    >
                      <span className="font-medium">{task.title}</span>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={getStatusBadgeVariant(task.status)}>{task.status}</Badge>
                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

'use client';

import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/component/ui/table';
import { TASK_PRIORITY_COLORS } from '@/lib/constant/priority';
import { TASK_STATUS_COLORS } from '@/lib/constant/status';
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function ReportPage() {
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();

  if (tasksLoading || projectsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const statusData = Object.entries(
    tasks?.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {},
  ).map(([name, value]) => ({ name, value }));

  const priorityData = Object.entries(
    tasks?.reduce(
      (acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {},
  ).map(([name, value]) => ({ name, value }));

  const totalTimeSpent = tasks?.reduce((acc, task) => acc + task.timeSpentMinutes, 0) || 0;
  const averageTimePerTask = tasks && tasks.length > 0 ? totalTimeSpent / tasks.length : 0;

  const projectStats = projects?.map((project) => {
    const projectTasks = tasks?.filter((t) => t.projectId === project.id) || [];
    const completedTasks = projectTasks.filter((t) => t.status === 'DONE');
    const totalTime = projectTasks.reduce((acc, t) => acc + t.timeSpentMinutes, 0);
    const progress =
      projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;

    return {
      name: project.name,
      totalTasks: projectTasks.length,
      completedTasks: completedTasks.length,
      progress: progress.toFixed(1),
      totalTimeHours: (totalTime / 60).toFixed(1),
    };
  });

  const completionRate =
    tasks && tasks.length > 0
      ? ((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100).toFixed(1)
      : '0';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Statistics</h1>
          <p className="text-muted-foreground">Overview of project progress and task status.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
              <p className="text-3xl font-bold">{tasks?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-3xl font-bold">{completionRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Time Spent</p>
              <p className="text-3xl font-bold">{(totalTimeSpent / 60).toFixed(1)}h</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Avg Time Per Task</p>
              <p className="text-3xl font-bold">{(averageTimePerTask / 60).toFixed(1)}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
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
                          key={entry.name}
                          fill={
                            TASK_STATUS_COLORS[entry.name as keyof typeof TASK_STATUS_COLORS] ??
                            '#9e9e9e'
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
              <CardTitle>Tasks by Priority</CardTitle>
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
                          key={entry.name}
                          fill={
                            TASK_PRIORITY_COLORS[entry.name as keyof typeof TASK_PRIORITY_COLORS] ??
                            '#9e9e9e'
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

        {/* Project Statistics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Project</TableHead>
                  <TableHead className="text-right">Total Tasks</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="text-right">Time Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectStats?.map((stat) => (
                  <TableRow key={stat.name}>
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

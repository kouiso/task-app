'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/trpc/react';
import { Box, Card, CardContent, CircularProgress, Grid, Paper, Typography } from '@mui/material';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#9e9e9e',
  IN_PROGRESS: '#2196f3',
  IN_REVIEW: '#ff9800',
  DONE: '#4caf50',
  CANCELLED: '#f44336',
  BLOCKED: '#e91e63',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#9e9e9e',
  MEDIUM: '#2196f3',
  HIGH: '#ff9800',
  URGENT: '#f44336',
};

export default function ReportPage() {
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();

  if (tasksLoading || projectsLoading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
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

  return (
    <AppLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Reports & Statistics
        </Typography>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h4">{tasks?.length || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Completion Rate
                </Typography>
                <Typography variant="h4">
                  {tasks && tasks.length > 0
                    ? (
                        (tasks.filter((t) => t.status === 'DONE').length / tasks.length) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Total Time Spent
                </Typography>
                <Typography variant="h4">{(totalTimeSpent / 60).toFixed(1)}h</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Avg Time Per Task
                </Typography>
                <Typography variant="h4">{(averageTimePerTask / 60).toFixed(1)}h</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tasks by Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
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
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tasks by Priority
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
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
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Project Statistics
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '12px',
                          borderBottom: '2px solid #ddd',
                        }}
                      >
                        Project
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px',
                          borderBottom: '2px solid #ddd',
                        }}
                      >
                        Total Tasks
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px',
                          borderBottom: '2px solid #ddd',
                        }}
                      >
                        Completed
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px',
                          borderBottom: '2px solid #ddd',
                        }}
                      >
                        Progress
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '12px',
                          borderBottom: '2px solid #ddd',
                        }}
                      >
                        Time Spent
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectStats?.map((stat) => (
                      <tr key={stat.name}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                          {stat.name}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '12px',
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          {stat.totalTasks}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '12px',
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          {stat.completedTasks}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '12px',
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          {stat.progress}%
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '12px',
                            borderBottom: '1px solid #ddd',
                          }}
                        >
                          {stat.totalTimeHours}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}

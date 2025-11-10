'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/trpc/react';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import PendingIcon from '@mui/icons-material/Pending';
import { Box, Card, CardContent, CircularProgress, Grid, Paper, Typography } from '@mui/material';
import { TaskStatus } from '@prisma/client';

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery();

  if (projectsLoading || tasksLoading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
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
      icon: <FolderIcon sx={{ fontSize: 40 }} color="primary" />,
      color: '#1976d2',
    },
    {
      title: 'Total Tasks',
      value: totalTasks,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} color="secondary" />,
      color: '#9c27b0',
    },
    {
      title: 'Completed Tasks',
      value: completedTasks,
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} color="success" />,
      color: '#2e7d32',
    },
    {
      title: 'In Progress',
      value: inProgressTasks,
      icon: <PendingIcon sx={{ fontSize: 40 }} color="warning" />,
      color: '#ed6c02',
    },
  ];

  const recentTasks = tasks?.slice(0, 5) || [];

  return (
    <AppLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        <Grid container spacing={3} mb={4}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4">{stat.value}</Typography>
                    </Box>
                    {stat.icon}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Projects
              </Typography>
              {projects && projects.length > 0 ? (
                <Box>
                  {projects.slice(0, 5).map((project) => {
                    const taskCount = project.tasks?.length || 0;
                    const doneCount = project.tasks?.filter((t) => t.status === 'DONE').length || 0;
                    const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0;

                    return (
                      <Box
                        key={project.id}
                        sx={{
                          mb: 2,
                          pb: 2,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        <Box display="flex" alignItems="center" mb={1}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: project.color,
                              mr: 1,
                            }}
                          />
                          <Typography variant="subtitle1">{project.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {doneCount} / {taskCount} tasks completed ({progress.toFixed(0)}%)
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography color="text.secondary">No projects yet</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Tasks
              </Typography>
              {recentTasks.length > 0 ? (
                <Box>
                  {recentTasks.map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        mb: 2,
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography variant="subtitle1">{task.title}</Typography>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              task.status === 'DONE'
                                ? 'success.main'
                                : task.status === 'IN_PROGRESS'
                                  ? 'primary.main'
                                  : 'grey.300',
                            color: 'white',
                          }}
                        >
                          {task.status}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              task.priority === 'URGENT'
                                ? 'error.main'
                                : task.priority === 'HIGH'
                                  ? 'warning.main'
                                  : 'grey.300',
                            color: 'white',
                          }}
                        >
                          {task.priority}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No tasks yet</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}

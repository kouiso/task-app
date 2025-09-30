'use client';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  Timer,
  Folder,
  TrendingUp,
  AccessTime,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  stats: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
    totalProjects: number;
    urgentTasks: number;
    overdueTasks: number;
    totalTimeSpent: number;
  };
  recentTasks: any[];
  tasksByProject: Array<{
    project: any;
    tasks: any[];
  }>;
  currentUserName: string;
}

export function Dashboard({ stats, recentTasks, tasksByProject, currentUserName }: DashboardProps) {
  const taskStatusData = [
    { name: 'TODO', value: stats.todoTasks, color: '#757575' },
    { name: '進行中', value: stats.inProgressTasks, color: '#1976d2' },
    { name: '完了', value: stats.doneTasks, color: '#4caf50' },
  ];

  const projectData = tasksByProject.map(item => ({
    name: item.project.name,
    tasks: item.tasks.length,
    completed: item.tasks.filter(t => t.status === 'DONE').length,
  }));

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
  };

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.doneTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        ダッシュボード
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        こんにちは、{currentUserName}さん
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    総タスク数
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalTasks}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assignment />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    完了率
                  </Typography>
                  <Typography variant="h4">
                    {completionRate}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionRate} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    緊急タスク
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.urgentTasks}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Warning />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    総作業時間
                  </Typography>
                  <Typography variant="h6">
                    {formatMinutesToHours(stats.totalTimeSpent)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Timer />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              タスク状態
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              プロジェクト別タスク
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tasks" fill="#8884d8" name="総タスク" />
                <Bar dataKey="completed" fill="#82ca9d" name="完了" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              最近のタスク
            </Typography>
            <List>
              {recentTasks.length === 0 ? (
                <ListItem>
                  <ListItemText 
                    primary="タスクがありません"
                    secondary="新しいタスクを作成してください"
                  />
                </ListItem>
              ) : (
                recentTasks.map((task) => (
                  <ListItem
                    key={task.id}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = `/tasks/${task.id}`}
                  >
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip 
                            label={task.status} 
                            size="small"
                            color={
                              task.status === 'DONE' ? 'success' :
                              task.status === 'IN_PROGRESS' ? 'primary' : 'default'
                            }
                          />
                          <Chip 
                            label={task.priority} 
                            size="small"
                            variant="outlined"
                            color={
                              task.priority === 'URGENT' ? 'error' :
                              task.priority === 'HIGH' ? 'warning' : 'default'
                            }
                          />
                          {task.project && (
                            <Chip 
                              label={task.project.name} 
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Folder sx={{ mr: 1, verticalAlign: 'middle' }} />
              プロジェクト
            </Typography>
            <Typography variant="h3" color="primary.main">
              {stats.totalProjects}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              アクティブなプロジェクト
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
              期限切れ
            </Typography>
            <Typography variant="h3" color={stats.overdueTasks > 0 ? 'error.main' : 'text.primary'}>
              {stats.overdueTasks}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              期限を過ぎたタスク
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              進行中
            </Typography>
            <Typography variant="h3" color="info.main">
              {stats.inProgressTasks}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              現在作業中のタスク
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
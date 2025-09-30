'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AssignmentLate,
  AssignmentTurnedIn,
  PlayArrow,
  Schedule,
} from '@mui/icons-material';

import { api } from '../../lib/trpc/client';

export default function Dashboard() {
  const theme = useTheme();

  // tRPCフックでデータを取得
  const { data: tasksData, isLoading: tasksLoading } = api.task.getAll.useQuery({});
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery({});

  if (tasksLoading || projectsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  const tasks = tasksData?.tasks || [];

  // 統計データを計算
  const stats = {
    totalTasks: tasks.length,
    todoTasks: tasks.filter(task => task.status === 'TODO').length,
    inProgressTasks: tasks.filter(task => task.status === 'IN_PROGRESS').length,
    completedTasks: tasks.filter(task => task.status === 'DONE').length,
    overdueTasks: tasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'
    ).length,
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 1,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        ダッシュボード
      </Typography>

      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="全タスク"
            value={stats.totalTasks}
            icon={<Schedule />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="進行中"
            value={stats.inProgressTasks}
            icon={<PlayArrow />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="完了済み"
            value={stats.completedTasks}
            icon={<AssignmentTurnedIn />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="期限切れ"
            value={stats.overdueTasks}
            icon={<AssignmentLate />}
            color="error"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 最近のタスク */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mb: 2 }}>
              最近のタスク
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tasks?.slice(0, 5).map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {task.project.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={task.status}
                      size="small"
                      color={
                        task.status === 'DONE'
                          ? 'success'
                          : task.status === 'IN_PROGRESS'
                          ? 'primary'
                          : 'default'
                      }
                    />
                    <Chip
                      label={task.priority}
                      size="small"
                      variant="outlined"
                      color={
                        task.priority === 'HIGH' || task.priority === 'URGENT'
                          ? 'error'
                          : task.priority === 'MEDIUM'
                          ? 'warning'
                          : 'default'
                      }
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* プロジェクト一覧 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mb: 2 }}>
              プロジェクト
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {projects?.map((project) => (
                <Box
                  key={project.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    borderLeft: 4,
                    borderLeftColor: project.color || theme.palette.primary.main,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="medium">
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.taskCount} タスク
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {project.memberCount} メンバー
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

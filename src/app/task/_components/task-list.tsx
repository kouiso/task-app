'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Stack,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Badge,
  LinearProgress,
  Fade,
  Alert,
} from '@mui/material';
import {
  Add,
  Assignment,
  Schedule,
  Flag,
  Timer,
  Comment,
  CheckCircle,
  RadioButtonUnchecked,
  Cancel,
  PlayArrow,
  Stop,
} from '@mui/icons-material';
import { api } from '@/lib/trpc/client';
import { TaskFilter } from './task-filter';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TaskListProps {
  userId: string;
}

export function TaskList({ userId }: TaskListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<any>({});
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: tasksData, isLoading, refetch } = api.task.getAll.useQuery({
    ...filters,
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
  });

  const { data: projects } = api.project.getAll.useQuery({});
  const { data: users } = api.user.getAll.useQuery();

  const startTimer = api.task.startTimer.useMutation({
    onSuccess: () => refetch(),
  });

  const stopTimer = api.task.stopTimer.useMutation({
    onSuccess: () => refetch(),
  });

  const updateStatus = api.task.update.useMutation({
    onSuccess: () => refetch(),
  });

  const tasks = tasksData?.tasks || [];
  const totalPages = Math.ceil((tasksData?.total || 0) / itemsPerPage);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return <RadioButtonUnchecked fontSize="small" />;
      case TaskStatus.IN_PROGRESS:
        return <Schedule fontSize="small" color="primary" />;
      case TaskStatus.DONE:
        return <CheckCircle fontSize="small" color="success" />;
      case TaskStatus.CANCELLED:
        return <Cancel fontSize="small" color="error" />;
      default:
        return <RadioButtonUnchecked fontSize="small" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'error';
      case TaskPriority.HIGH:
        return 'warning';
      case TaskPriority.MEDIUM:
        return 'primary';
      case TaskPriority.LOW:
        return 'default';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return '緊急';
      case TaskPriority.HIGH:
        return '高';
      case TaskPriority.MEDIUM:
        return '中';
      case TaskPriority.LOW:
        return '低';
      default:
        return priority;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateStatus.mutateAsync({ id: taskId, status: newStatus });
  };

  const handleTimerToggle = async (task: any) => {
    if (task.isTimerActive) {
      await stopTimer.mutateAsync({ id: task.id });
    } else {
      await startTimer.mutateAsync({ id: task.id });
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1">
              タスク管理
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {tasksData?.total || 0} 件のタスク
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/task/new')}
          >
            新規タスク
          </Button>
        </Stack>

        <TaskFilter
          filters={filters}
          onFiltersChange={setFilters}
          projects={projects || []}
          users={users || []}
        />

        {tasks.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Assignment sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              タスクが見つかりません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {Object.keys(filters).length > 0
                ? 'フィルター条件を変更してみてください'
                : '新しいタスクを作成してください'}
            </Typography>
            {Object.keys(filters).length === 0 && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push('/task/new')}
              >
                最初のタスクを作成
              </Button>
            )}
          </Paper>
        ) : (
          <>
            <Stack spacing={2}>
              {tasks.map((task) => (
                <Fade in key={task.id}>
                  <Paper
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.no-navigate')) {
                        return;
                      }
                      router.push(`/task/${task.id}`);
                    }}
                  >
                    {task.isTimerActive && (
                      <LinearProgress 
                        sx={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                        }} 
                      />
                    )}
                    
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box className="no-navigate">
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(
                                  task.id,
                                  task.status === TaskStatus.DONE
                                    ? TaskStatus.TODO
                                    : TaskStatus.DONE
                                )}
                              >
                                {getStatusIcon(task.status)}
                              </IconButton>
                            </Box>
                            <Typography
                              variant="h6"
                              sx={{
                                textDecoration: task.status === TaskStatus.DONE
                                  ? 'line-through'
                                  : 'none',
                                color: task.status === TaskStatus.DONE
                                  ? 'text.disabled'
                                  : 'text.primary',
                              }}
                            >
                              {task.title}
                            </Typography>
                          </Stack>
                          
                          {task.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {task.description}
                            </Typography>
                          )}
                        </Box>

                        <Box className="no-navigate">
                          <IconButton
                            size="small"
                            color={task.isTimerActive ? 'error' : 'primary'}
                            onClick={() => handleTimerToggle(task)}
                          >
                            {task.isTimerActive ? <Stop /> : <PlayArrow />}
                          </IconButton>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={getPriorityLabel(task.priority)}
                          size="small"
                          color={getPriorityColor(task.priority)}
                          icon={<Flag />}
                        />
                        
                        <Chip
                          label={task.status}
                          size="small"
                          variant="outlined"
                        />

                        {task.project && (
                          <Chip
                            label={task.project.name}
                            size="small"
                            sx={{
                              bgcolor: task.project.color + '20',
                              color: task.project.color,
                              border: `1px solid ${task.project.color}50`,
                            }}
                          />
                        )}

                        {task.assignee && (
                          <Chip
                            avatar={
                              <Avatar sx={{ width: 20, height: 20 }}>
                                {task.assignee.name?.[0] || task.assignee.email[0]}
                              </Avatar>
                            }
                            label={task.assignee.name || task.assignee.email}
                            size="small"
                            variant="outlined"
                          />
                        )}

                        {task.dueDate && (
                          <Chip
                            icon={<Schedule />}
                            label={formatDistanceToNow(new Date(task.dueDate), {
                              addSuffix: true,
                              locale: ja,
                            })}
                            size="small"
                            color={new Date(task.dueDate) < new Date() ? 'error' : 'default'}
                            variant="outlined"
                          />
                        )}

                        {task.timeSpentMinutes > 0 && (
                          <Chip
                            icon={<Timer />}
                            label={`${Math.floor(task.timeSpentMinutes / 60)}h ${task.timeSpentMinutes % 60}m`}
                            size="small"
                            variant="outlined"
                          />
                        )}

                        {task.commentCount > 0 && (
                          <Tooltip title={`${task.commentCount} コメント`}>
                            <Badge badgeContent={task.commentCount} color="primary">
                              <Comment fontSize="small" color="action" />
                            </Badge>
                          </Tooltip>
                        )}
                      </Stack>

                      {task.estimatedHours && (
                        <Box sx={{ mt: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              進捗:
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(
                                  100,
                                  (task.actualHours / task.estimatedHours) * 100
                                )}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {Math.round((task.actualHours / task.estimatedHours) * 100)}%
                            </Typography>
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Fade>
              ))}
            </Stack>

            {totalPages > 1 && (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 4 }}
              >
                <FormControl size="small">
                  <Select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <MenuItem value={10}>10件</MenuItem>
                    <MenuItem value={20}>20件</MenuItem>
                    <MenuItem value={50}>50件</MenuItem>
                    <MenuItem value={100}>100件</MenuItem>
                  </Select>
                </FormControl>
                
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Stack>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
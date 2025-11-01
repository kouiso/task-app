'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskDialog, type TaskFormData } from '@/components/task/TaskDialog';
import { api } from '@/trpc/react';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { TaskPriority, type TaskStatus } from '@prisma/client';
import { useState } from 'react';

export default function TaskPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>(undefined);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');

  const utils = api.useUtils();

  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery(
    {
      projectId: filterProject || undefined,
      status: filterStatus || undefined,
    },
    { refetchOnWindowFocus: false },
  );

  const { data: projects } = api.project.getAll.useQuery();
  const { data: users } = api.user.getAll.useQuery();
  const { data: taskDetail } = api.task.getById.useQuery(
    { id: selectedTask ?? '' },
    { enabled: !!selectedTask },
  );

  const createMutation = api.task.create.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = api.task.update.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      if (selectedTask) {
        utils.task.getById.invalidate({ id: selectedTask });
      }
      setDialogOpen(false);
    },
  });

  const deleteMutation = api.task.delete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
    },
  });

  const handleCreate = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      setEditingTask({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
        estimatedHours: task.estimatedHours || undefined,
        projectId: task.projectId,
        assigneeId: task.assigneeId || undefined,
      });
      setDialogOpen(true);
    }
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ id: taskId });
    }
  };

  const handleSubmit = (data: TaskFormData) => {
    if (data.id) {
      updateMutation.mutate({
        id: data.id,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        estimatedHours: data.estimatedHours || null,
        assigneeId: data.assigneeId || null,
      });
    } else {
      createMutation.mutate({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        estimatedHours: data.estimatedHours,
        projectId: data.projectId,
        createdById: users?.[0]?.id || '',
        assigneeId: data.assigneeId,
      });
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedTask(null);
  };

  if (tasksLoading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Tasks</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            New Task
          </Button>
        </Box>

        <Box display="flex" gap={2} mb={3}>
          <TextField
            select
            label="Filter by Project"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">All Projects</MenuItem>
            {projects?.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Filter by Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="TODO">TODO</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="IN_REVIEW">In Review</MenuItem>
            <MenuItem value="DONE">Done</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
            <MenuItem value="BLOCKED">Blocked</MenuItem>
          </TextField>
        </Box>

        <Grid container spacing={3}>
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <TaskCard
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  assignee={task.assignee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleTaskClick}
                />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Typography color="text.secondary" align="center">
                No tasks found. Create your first task!
              </Typography>
            </Grid>
          )}
        </Grid>

        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingTask}
          projects={projects || []}
          users={users || []}
          currentUserId={users?.[0]?.id || ''}
        />

        <Dialog open={detailOpen} onClose={handleDetailClose} maxWidth="md" fullWidth>
          <DialogTitle>{taskDetail?.title}</DialogTitle>
          <DialogContent>
            {taskDetail && (
              <Box>
                <Typography variant="body1" paragraph>
                  {taskDetail.description || 'No description'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body1">{taskDetail.status}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Priority
                    </Typography>
                    <Typography variant="body1">{taskDetail.priority}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Project
                    </Typography>
                    <Typography variant="body1">{taskDetail.project.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Assignee
                    </Typography>
                    <Typography variant="body1">
                      {taskDetail.assignee?.name || taskDetail.assignee?.email || 'Unassigned'}
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Comments ({taskDetail.comments?.length || 0})
                </Typography>
                <List>
                  {taskDetail.comments?.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start">
                      <ListItemText
                        primary={comment.user.name || comment.user.email}
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              {comment.content}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {new Date(comment.createdAt).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDetailClose}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}

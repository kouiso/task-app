'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TaskCard } from '@/components/task/task-card';
import { TaskDialog, type TaskFormData } from '@/components/task/task-dialog';
import { api } from '@/trpc/react';
import AddIcon from '@mui/icons-material/Add';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  Checkbox,
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
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { TaskStatus } from '@prisma/client';
import { useState } from 'react';

export default function TaskPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>(undefined);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [commentContent, setCommentContent] = useState('');

  const utils = api.useUtils();

  const { data: session } = api.auth.getSession.useQuery();
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

  const bulkCompleteMutation = api.task.bulkComplete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
    },
  });

  const bulkDeleteMutation = api.task.bulkDelete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
    },
  });

  const bulkUpdateStatusMutation = api.task.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
      setBulkMenuAnchor(null);
    },
  });

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      if (selectedTask) {
        utils.task.getById.invalidate({ id: selectedTask });
      }
      setCommentContent('');
    },
  });

  const handleCreate = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined;

      setEditingTask({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        ...(dueDate && { dueDate }),
        ...(task.estimatedHours && { estimatedHours: task.estimatedHours }),
        ...(task.assigneeId && { assigneeId: task.assigneeId }),
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
      if (!session?.user?.id) {
        console.error('No user session found');
        return;
      }
      createMutation.mutate({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        estimatedHours: data.estimatedHours,
        projectId: data.projectId,
        createdById: session.user.id,
        assigneeId: data.assigneeId || undefined,
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
    setCommentContent('');
  };

  const handleCommentSubmit = () => {
    if (!commentContent.trim() || !selectedTask || !session?.user?.id) return;

    createCommentMutation.mutate({
      content: commentContent.trim(),
      taskId: selectedTask,
      userId: session.user.id,
    });
  };

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      checked ? next.add(taskId) : next.delete(taskId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTasks(checked ? new Set(tasks?.map((t) => t.id) || []) : new Set());
  };

  const handleBulkComplete = () => {
    if (selectedTasks.size > 0) {
      bulkCompleteMutation.mutate({ ids: Array.from(selectedTasks) });
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size > 0 && confirm(`Delete ${selectedTasks.size} tasks?`)) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedTasks) });
    }
  };

  const handleBulkUpdateStatus = (status: TaskStatus) => {
    if (selectedTasks.size > 0) {
      bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedTasks), status });
    }
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
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">Tasks</Typography>
            {selectedTasks.size > 0 && (
              <Typography variant="body2" color="text.secondary">
                ({selectedTasks.size} selected)
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1}>
            {selectedTasks.size > 0 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<CheckBoxIcon />}
                  onClick={handleBulkComplete}
                >
                  Complete
                </Button>
                <Button variant="outlined" onClick={(e) => setBulkMenuAnchor(e.currentTarget)}>
                  Change Status
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                >
                  Delete
                </Button>
              </>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
              New Task
            </Button>
          </Box>
        </Box>

        <Box display="flex" gap={2} mb={3} alignItems="center">
          <Checkbox
            checked={!!(tasks && tasks.length > 0 && selectedTasks.size === tasks.length)}
            indeterminate={!!(tasks && selectedTasks.size > 0 && selectedTasks.size < tasks.length)}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
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
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onChange={(e) => handleTaskSelect(task.id, e.target.checked)}
                    sx={{ mt: 1 }}
                  />
                  <Box flex={1}>
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
                  </Box>
                </Box>
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

        <Menu
          anchorEl={bulkMenuAnchor}
          open={Boolean(bulkMenuAnchor)}
          onClose={() => setBulkMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleBulkUpdateStatus('TODO')}>TODO</MenuItem>
          <MenuItem onClick={() => handleBulkUpdateStatus('IN_PROGRESS')}>In Progress</MenuItem>
          <MenuItem onClick={() => handleBulkUpdateStatus('IN_REVIEW')}>In Review</MenuItem>
          <MenuItem onClick={() => handleBulkUpdateStatus('DONE')}>Done</MenuItem>
          <MenuItem onClick={() => handleBulkUpdateStatus('CANCELLED')}>Cancelled</MenuItem>
          <MenuItem onClick={() => handleBulkUpdateStatus('BLOCKED')}>Blocked</MenuItem>
        </Menu>

        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingTask}
          projects={projects || []}
          users={users || []}
          currentUserId={session?.user?.id || ''}
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
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    placeholder="Add a comment..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    disabled={createCommentMutation.isPending}
                  />
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      onClick={handleCommentSubmit}
                      disabled={!commentContent.trim() || createCommentMutation.isPending}
                    >
                      {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </Box>
                </Box>
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

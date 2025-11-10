'use client';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { useState } from 'react';
import { TaskTimer } from './task-timer';
import { TimeLogDialog } from './time-log-dialog';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  assignee?: {
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  isTimerActive?: boolean;
  timerStartedAt?: Date | null;
  timeSpentMinutes?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  onTimerUpdate?: () => void;
}

const statusColors: Record<TaskStatus, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  TODO: 'default',
  IN_PROGRESS: 'primary',
  IN_REVIEW: 'warning',
  DONE: 'success',
  CANCELLED: 'error',
  BLOCKED: 'error',
};

const priorityColors: Record<TaskPriority, 'default' | 'primary' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
};

export function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  assignee,
  isTimerActive = false,
  timerStartedAt = null,
  timeSpentMinutes = 0,
  onEdit,
  onDelete,
  onClick,
  onTimerUpdate,
}: TaskCardProps) {
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleOpenTimeLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeLogDialogOpen(true);
  };

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 3 } : {},
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Box>
            <IconButton
              size="small"
              onClick={handleEdit}
              aria-label="Edit task"
              data-testid="edit-task-button"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label="Delete task"
              data-testid="delete-task-button"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {description}
          </Typography>
        )}

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip label={status} color={statusColors[status]} size="small" />
          <Chip label={priority} color={priorityColors[priority]} size="small" />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          {assignee && (
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar
                src={assignee.avatar || undefined}
                alt={assignee.name || assignee.email}
                sx={{ width: 24, height: 24 }}
              >
                {(assignee.name || assignee.email)[0].toUpperCase()}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {assignee.name || assignee.email}
              </Typography>
            </Box>
          )}

          {dueDate && (
            <Typography variant="caption" color="text.secondary">
              Due: {new Date(dueDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <TaskTimer
            taskId={id}
            isTimerActive={isTimerActive}
            timerStartedAt={timerStartedAt}
            timeSpentMinutes={timeSpentMinutes}
            onTimerUpdate={onTimerUpdate}
          />
          <Button
            size="small"
            startIcon={<AccessTimeIcon />}
            onClick={handleOpenTimeLog}
            sx={{ mt: 1 }}
            aria-label="Log time manually"
            data-testid="log-time-button"
          >
            Log Time Manually
          </Button>
        </Box>
      </CardContent>

      <TimeLogDialog
        open={timeLogDialogOpen}
        onClose={() => setTimeLogDialogOpen(false)}
        taskId={id}
        onSuccess={onTimerUpdate}
      />
    </Card>
  );
}

'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Avatar, Box, Card, CardContent, Chip, IconButton, Typography } from '@mui/material';
import type { TaskPriority, TaskStatus } from '@prisma/client';

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
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
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
  onEdit,
  onDelete,
  onClick,
}: TaskCardProps) {
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
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleDelete}>
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

        <Box display="flex" justifyContent="space-between" alignItems="center">
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
      </CardContent>
    </Card>
  );
}

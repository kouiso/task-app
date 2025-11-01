'use client';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';

interface ProjectCardProps {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  memberCount: number;
  taskStats: {
    total: number;
    done: number;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}

export function ProjectCard({
  id,
  name,
  description,
  color,
  memberCount,
  taskStats,
  onEdit,
  onDelete,
  onClick,
}: ProjectCardProps) {
  const progress = taskStats.total > 0 ? (taskStats.done / taskStats.total) * 100 : 0;

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
        borderLeft: `4px solid ${color}`,
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="div">
            {name}
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

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {taskStats.done} / {taskStats.total} tasks
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} />
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          <PeopleIcon fontSize="small" color="action" />
          <Chip label={`${memberCount} members`} size="small" variant="outlined" />
        </Box>
      </CardContent>
    </Card>
  );
}

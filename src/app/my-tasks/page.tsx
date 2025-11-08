'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { TaskCard } from '@/components/task/TaskCard';
import { api } from '@/trpc/react';
import {
  Box,
  CircularProgress,
  Grid,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { TaskStatus } from '@prisma/client';
import { useState } from 'react';

const STATUS_TABS: { label: string; value: TaskStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Done', value: 'DONE' },
];

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [filterProject, setFilterProject] = useState<string>('');

  const { data: currentUser } = api.user.getCurrentUser.useQuery();
  const { data: projects } = api.project.getAll.useQuery();
  const { data: tasks, isLoading } = api.task.getAll.useQuery(
    {
      assigneeId: currentUser?.id,
      status: STATUS_TABS[activeTab]?.value || undefined,
      projectId: filterProject || undefined,
    },
    { enabled: !!currentUser },
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const groupedTasks = {
    overdue: tasks?.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()) || [],
    today:
      tasks?.filter((t) => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }) || [],
    upcoming:
      tasks?.filter((t) => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate > today && dueDate.toDateString() !== today.toDateString();
      }) || [],
    noDueDate: tasks?.filter((t) => !t.dueDate) || [],
  };

  if (isLoading) {
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
        <Typography variant="h4" mb={3}>
          My Tasks
        </Typography>

        <Box display="flex" gap={2} mb={3}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            {STATUS_TABS.map((tab) => (
              <Tab key={tab.label} label={tab.label} />
            ))}
          </Tabs>
          <Box flex={1} />
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
        </Box>

        {groupedTasks.overdue.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" color="error" mb={2}>
              Overdue ({groupedTasks.overdue.length})
            </Typography>
            <Grid container spacing={2}>
              {groupedTasks.overdue.map((task) => (
                <Grid item xs={12} sm={6} md={4} key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    assignee={task.assignee}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {groupedTasks.today.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" color="warning.main" mb={2}>
              Due Today ({groupedTasks.today.length})
            </Typography>
            <Grid container spacing={2}>
              {groupedTasks.today.map((task) => (
                <Grid item xs={12} sm={6} md={4} key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    assignee={task.assignee}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {groupedTasks.upcoming.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" mb={2}>
              Upcoming ({groupedTasks.upcoming.length})
            </Typography>
            <Grid container spacing={2}>
              {groupedTasks.upcoming.map((task) => (
                <Grid item xs={12} sm={6} md={4} key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    assignee={task.assignee}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {groupedTasks.noDueDate.length > 0 && (
          <Box mb={4}>
            <Typography variant="h6" mb={2}>
              No Due Date ({groupedTasks.noDueDate.length})
            </Typography>
            <Grid container spacing={2}>
              {groupedTasks.noDueDate.map((task) => (
                <Grid item xs={12} sm={6} md={4} key={task.id}>
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    assignee={task.assignee}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tasks && tasks.length === 0 && (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              No tasks assigned to you
            </Typography>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

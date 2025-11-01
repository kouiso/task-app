'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectCard } from '@/components/project/ProjectCard';
import { ProjectDialog, type ProjectFormData } from '@/components/project/ProjectDialog';
import { api } from '@/trpc/react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { ProjectMemberRole } from '@prisma/client';
import { useState } from 'react';

export default function ProjectPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectFormData | undefined>(undefined);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>('MEMBER');

  const utils = api.useUtils();

  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery();
  const { data: users } = api.user.getAll.useQuery();
  const { data: projectDetail } = api.project.getById.useQuery(
    { id: selectedProject ?? '' },
    { enabled: !!selectedProject },
  );

  const createMutation = api.project.create.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = api.project.update.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
      setDialogOpen(false);
    },
  });

  const deleteMutation = api.project.delete.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      setDetailOpen(false);
    },
  });

  const addMemberMutation = api.project.addMember.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
      setMemberDialogOpen(false);
      setNewMemberUserId('');
      setNewMemberRole('MEMBER');
    },
  });

  const removeMemberMutation = api.project.removeMember.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
    },
  });

  const handleCreate = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId);
    if (project) {
      setEditingProject({
        id: project.id,
        name: project.name,
        description: project.description || '',
        color: project.color,
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split('T')[0]
          : undefined,
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split('T')[0]
          : undefined,
      });
      setDialogOpen(true);
    }
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteMutation.mutate({ id: projectId });
    }
  };

  const handleSubmit = (data: ProjectFormData) => {
    if (data.id) {
      updateMutation.mutate({
        id: data.id,
        name: data.name,
        description: data.description || null,
        color: data.color,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description,
        color: data.color,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
        ownerId: users?.[0]?.id || '',
      });
    }
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProject(projectId);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedProject(null);
  };

  const handleAddMember = () => {
    if (selectedProject && newMemberUserId) {
      addMemberMutation.mutate({
        projectId: selectedProject,
        userId: newMemberUserId,
        role: newMemberRole,
      });
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (selectedProject && confirm('Are you sure you want to remove this member?')) {
      removeMemberMutation.mutate({
        projectId: selectedProject,
        userId,
      });
    }
  };

  if (projectsLoading) {
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
          <Typography variant="h4">Projects</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            New Project
          </Button>
        </Box>

        <Grid container spacing={3}>
          {projects && projects.length > 0 ? (
            projects.map((project) => {
              const taskCount = project.tasks?.length || 0;
              const doneCount = project.tasks?.filter((t) => t.status === 'DONE').length || 0;

              return (
                <Grid item xs={12} sm={6} md={4} key={project.id}>
                  <ProjectCard
                    id={project.id}
                    name={project.name}
                    description={project.description}
                    color={project.color}
                    memberCount={project.members?.length || 0}
                    taskStats={{ total: taskCount, done: doneCount }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={handleProjectClick}
                  />
                </Grid>
              );
            })
          ) : (
            <Grid item xs={12}>
              <Typography color="text.secondary" align="center">
                No projects found. Create your first project!
              </Typography>
            </Grid>
          )}
        </Grid>

        <ProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingProject}
        />

        <Dialog open={detailOpen} onClose={handleDetailClose} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: projectDetail?.color,
                }}
              />
              {projectDetail?.name}
            </Box>
          </DialogTitle>
          <DialogContent>
            {projectDetail && (
              <Box>
                <Typography variant="body1" paragraph>
                  {projectDetail.description || 'No description'}
                </Typography>

                <Box mb={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Members ({projectDetail.members?.length || 0})
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setMemberDialogOpen(true)}
                    >
                      Add Member
                    </Button>
                  </Box>
                  <List>
                    {projectDetail.members?.map((member) => (
                      <ListItem
                        key={member.id}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={member.role === 'OWNER'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar src={member.user.avatar || undefined}>
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.user.name || member.user.email}
                          secondary={<Chip label={member.role} size="small" variant="outlined" />}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>
                    Tasks ({projectDetail.tasks?.length || 0})
                  </Typography>
                  <List>
                    {projectDetail.tasks?.map((task) => (
                      <ListItem key={task.id}>
                        <ListItemText
                          primary={task.title}
                          secondary={
                            <Box display="flex" gap={1} mt={0.5}>
                              <Chip label={task.status} size="small" />
                              <Chip label={task.priority} size="small" />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDetailClose}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={memberDialogOpen}
          onClose={() => setMemberDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Member</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    label="User"
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                  >
                    {users
                      ?.filter(
                        (user) =>
                          !projectDetail?.members?.some((member) => member.userId === user.id),
                      )
                      .map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </MenuItem>
                      ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    label="Role"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as ProjectMemberRole)}
                  >
                    <MenuItem value="MEMBER">Member</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="VIEWER">Viewer</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} variant="contained" disabled={!newMemberUserId}>
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}

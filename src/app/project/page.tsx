'use client';

import type { ProjectMemberRole } from '@prisma/client';
import { Archive, ArchiveRestore, Plus, Trash2, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { ProjectCard } from '@/component/project/project-card';
import { ProjectDialog, type ProjectFormData } from '@/component/project/project-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Label } from '@/component/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Switch } from '@/component/ui/switch';
import { api } from '@/trpc/react';

function ProjectPageContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectFormData | undefined>(undefined);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>('MEMBER');
  const [showArchived, setShowArchived] = useState(false);

  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProject(projectIdParam);
      setDetailOpen(true);
    }
  }, [projectIdParam]);

  const utils = api.useUtils();

  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery({
    isArchived: showArchived,
  });
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

  const archiveMutation = api.project.archive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      setDetailOpen(false);
    },
  });

  const unarchiveMutation = api.project.unarchive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      setDetailOpen(false);
    },
  });

  const handleCreate = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId);
    if (project) {
      const startDate = project.startDate
        ? new Date(project.startDate).toISOString().split('T')[0]
        : undefined;
      const endDate = project.endDate
        ? new Date(project.endDate).toISOString().split('T')[0]
        : undefined;

      setEditingProject({
        id: project.id,
        name: project.name,
        description: project.description || '',
        color: project.color,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
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

  const handleArchive = (projectId: string, isArchived: boolean) => {
    const mutation = isArchived ? unarchiveMutation : archiveMutation;
    mutation.mutate({ id: projectId });
  };

  if (projectsLoading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="show-archived">Show Archived</Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => {
              const taskCount = project.tasks?.length || 0;
              const doneCount = project.tasks?.filter((t) => t.status === 'DONE').length || 0;

              return (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  color={project.color}
                  memberCount={project.members?.length || 0}
                  taskStats={{ total: taskCount, done: doneCount }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClick={handleProjectClick}
                  isArchived={project.isArchived}
                />
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No projects found.</p>
              <p>Create your first project to get started!</p>
            </div>
          )}
        </div>

        <ProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingProject}
        />

        <Dialog open={detailOpen} onOpenChange={(isOpen) => !isOpen && handleDetailClose()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: projectDetail?.color }}
                />
                {projectDetail?.name}
              </DialogTitle>
              <DialogDescription>
                {projectDetail?.description || 'No description'}
              </DialogDescription>
            </DialogHeader>

            {projectDetail && (
              <div className="space-y-6">
                {/* Members Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Members ({projectDetail.members?.length || 0})
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setMemberDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {projectDetail.members?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user?.avatar || ''} />
                            <AvatarFallback>
                              {(member.user?.name || member.user?.email || '?')[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.user?.name || member.user?.email || 'Unknown'}
                            </p>
                            <Badge variant="outline">{member.role}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={member.role === 'OWNER'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Tasks ({projectDetail.tasks?.length || 0})
                  </h3>
                  <div className="grid gap-2">
                    {projectDetail.tasks?.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{task.status}</Badge>
                          <Badge variant="outline">{task.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <div className="flex-1 flex justify-start">
                <Button
                  variant="outline"
                  onClick={() =>
                    projectDetail && handleArchive(projectDetail.id, projectDetail.isArchived)
                  }
                >
                  {projectDetail?.isArchived ? (
                    <>
                      <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </>
                  )}
                </Button>
              </div>
              <Button onClick={handleDetailClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
              <DialogDescription>Add a new member to this project.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">User</Label>
                <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      ?.filter(
                        (user) =>
                          !projectDetail?.members?.some((member) => member.userId === user.id),
                      )
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => setNewMemberRole(value as ProjectMemberRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={!newMemberUserId}>
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </AppLayout>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}

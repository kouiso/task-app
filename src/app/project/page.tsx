'use client';

import { Archive, ArchiveRestore, Plus, Trash2, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { ProjectCard } from '@/component/project/project-card';
import { ProjectDialog, type ProjectFormData } from '@/component/project/project-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Switch } from '@/component/ui/switch';
import { isTaskPriority, TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import {
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE_LABELS,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
import { isTaskStatus, TASK_STATUS_LABELS } from '@/lib/constant/status';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [removeMemberTargetId, setRemoveMemberTargetId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProject(projectIdParam);
      setDetailOpen(true);
    }
  }, [projectIdParam]);

  const utils = api.useUtils();

  const { data: currentUser } = api.user.getCurrentUser.useQuery();
  const { data: projects, isLoading: projectsLoading } = api.project.getAll.useQuery({
    isArchived: showArchived,
  });
  const { data: availableUsers } = api.project.getAvailableUsers.useQuery(
    { projectId: selectedProject ?? '' },
    { enabled: !!selectedProject },
  );
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
    setDeleteTargetId(projectId);
    setDeleteDialogOpen(true);
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
      if (!currentUser?.id) {
        return;
      }
      createMutation.mutate({
        name: data.name,
        description: data.description,
        color: data.color,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
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
    setRemoveMemberTargetId(userId);
    setRemoveMemberDialogOpen(true);
  };

  const handleArchive = (projectId: string, isArchived: boolean) => {
    const mutation = isArchived ? unarchiveMutation : archiveMutation;
    mutation.mutate({ id: projectId });
  };

  if (projectsLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">プロジェクト</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="show-archived">アーカイブ表示</Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> 新規プロジェクト
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
              <p>プロジェクトが見つかりません。</p>
              <p>最初のプロジェクトを作成しましょう！</p>
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
              <DialogDescription>{projectDetail?.description || '説明なし'}</DialogDescription>
            </DialogHeader>

            {projectDetail && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      メンバー ({projectDetail.members?.length || 0})
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setMemberDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
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
                              {member.user?.name || member.user?.email || '不明'}
                            </p>
                            <Badge variant="outline">
                              {isProjectMemberRole(member.role)
                                ? PROJECT_MEMBER_ROLE_LABELS[member.role]
                                : member.role}
                            </Badge>
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

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    タスク ({projectDetail.tasks?.length || 0})
                  </h3>
                  <div className="grid gap-2">
                    {projectDetail.tasks?.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {isTaskStatus(task.status)
                              ? TASK_STATUS_LABELS[task.status]
                              : task.status}
                          </Badge>
                          <Badge variant="outline">
                            {isTaskPriority(task.priority)
                              ? TASK_PRIORITY_LABELS[task.priority]
                              : task.priority}
                          </Badge>
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
                      <ArchiveRestore className="mr-2 h-4 w-4" /> アーカイブ解除
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" /> アーカイブ
                    </>
                  )}
                </Button>
              </div>
              <Button onClick={handleDetailClose}>閉じる</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>メンバー追加</DialogTitle>
              <DialogDescription>このプロジェクトに新しいメンバーを追加します。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="user">ユーザー</Label>
                <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                  <SelectTrigger id="user">
                    <SelectValue placeholder="ユーザーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">ロール</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => {
                    if (isProjectMemberRole(value)) setNewMemberRole(value);
                  }}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="ロールを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">メンバー</SelectItem>
                    <SelectItem value="ADMIN">管理者</SelectItem>
                    <SelectItem value="VIEWER">閲覧者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddMember} disabled={!newMemberUserId}>
                メンバー追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate({ id: deleteTargetId });
          }
        }}
        isPending={deleteMutation.isPending}
        title="プロジェクトを削除しますか？"
      />

      <DeleteConfirmDialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
        onConfirm={() => {
          if (selectedProject && removeMemberTargetId) {
            removeMemberMutation.mutate({
              projectId: selectedProject,
              userId: removeMemberTargetId,
            });
          }
        }}
        isPending={removeMemberMutation.isPending}
        title="このメンバーを削除しますか？"
      />
    </AppLayout>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <ProjectPageContent />
    </Suspense>
  );
}

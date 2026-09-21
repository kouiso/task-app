'use client';

import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { ProjectCard } from '@/component/project/project-card';
import { ProjectDetailView } from '@/component/project/project-detail-view';
import { ProjectDialog, type ProjectFormData } from '@/component/project/project-dialog';
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
import {
  hasPermission,
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_ROLE_LABELS,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import { dateOnlyFromValue, dateOnlyToUtcStartIso } from '@/lib/date';
import { httpStatusOf, isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { api } from '@/trpc/react';

const shouldRetryProjectQuery = (failureCount: number, error: unknown) =>
  httpStatusOf(error) !== 404 && shouldRetryQuery(failureCount, error);

function ProjectPageContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectFormData | undefined>(undefined);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>(PROJECT_MEMBER_ROLE.MEMBER);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [removeMemberTargetId, setRemoveMemberTargetId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const selectedProject = projectIdParam;
  const router = useRouter();

  const utils = api.useUtils();

  const {
    data: currentUser,
    isLoading: currentUserLoading,
    isError: currentUserError,
    isFetching: currentUserFetching,
    error: currentUserQueryError,
    refetch: refetchCurrentUser,
  } = api.auth.getCurrentUser.useQuery(undefined, { retry: shouldRetryProjectQuery });
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    isFetching: projectsFetching,
    error: projectsQueryError,
    refetch: refetchProjects,
  } = api.project.getAll.useQuery(
    {
      // showArchived が true のとき isArchived フィルターを外して
      // 進行中・アーカイブ両方を取得する
      isArchived: showArchived ? undefined : false,
    },
    { enabled: !selectedProject, retry: shouldRetryProjectQuery },
  );
  const {
    data: projectDetail,
    isLoading: projectDetailLoading,
    isError: projectDetailError,
    isFetching: projectDetailFetching,
    error: projectDetailQueryError,
    refetch: refetchProjectDetail,
  } = api.project.getById.useQuery(
    { id: selectedProject ?? '' },
    { enabled: !!selectedProject, retry: shouldRetryProjectQuery },
  );

  // 詳細画面で操作ボタンの表示可否を決めるため、
  // ログインユーザー自身のプロジェクト内ロールから権限を求める
  const currentMember = projectDetail?.members?.find((m) => m.userId === currentUser?.id);
  const currentMemberRole =
    currentMember && isProjectMemberRole(currentMember.role) ? currentMember.role : undefined;
  const canManageMembers = currentMemberRole
    ? hasPermission(currentMemberRole, 'canManageMembers')
    : false;
  const canArchiveProject = currentMemberRole
    ? hasPermission(currentMemberRole, 'canArchive')
    : false;

  const { data: availableUsers } = api.project.getAvailableUsers.useQuery(
    { projectId: selectedProject ?? '' },
    {
      enabled: !!selectedProject && canManageMembers,
      retry: shouldRetryProjectQuery,
    },
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
      router.push('/project');
    },
  });

  const addMemberMutation = api.project.addMember.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
      setMemberDialogOpen(false);
      setNewMemberUserId('');
      setNewMemberRole(PROJECT_MEMBER_ROLE.MEMBER);
    },
  });

  const removeMemberMutation = api.project.removeMember.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
    },
  });

  const updateMemberRoleMutation = api.project.updateMemberRole.useMutation({
    onSuccess: () => {
      if (selectedProject) {
        utils.project.getById.invalidate({ id: selectedProject });
      }
    },
  });

  const archiveMutation = api.project.archive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      utils.project.getById.invalidate();
      router.push('/project');
    },
  });

  const unarchiveMutation = api.project.unarchive.useMutation({
    onSuccess: () => {
      utils.project.getAll.invalidate();
      utils.project.getById.invalidate();
      router.push('/project');
    },
  });

  const handleCreate = () => {
    setEditingProject(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId);
    if (project) {
      const startDate = project.startDate ? dateOnlyFromValue(project.startDate) : undefined;
      const endDate = project.endDate ? dateOnlyFromValue(project.endDate) : undefined;

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
        startDate: data.startDate ? dateOnlyToUtcStartIso(data.startDate) : null,
        endDate: data.endDate ? dateOnlyToUtcStartIso(data.endDate) : null,
      });
    } else {
      if (!currentUser?.id) {
        return;
      }
      createMutation.mutate({
        name: data.name,
        description: data.description,
        color: data.color,
        startDate: data.startDate ? dateOnlyToUtcStartIso(data.startDate) : undefined,
        endDate: data.endDate ? dateOnlyToUtcStartIso(data.endDate) : undefined,
      });
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/project?projectId=${projectId}`);
  };

  const handleDetailClose = () => {
    router.push('/project');
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

  const handleUpdateMemberRole = (userId: string, role: ProjectMemberRole) => {
    if (selectedProject) {
      updateMemberRoleMutation.mutate({
        projectId: selectedProject,
        userId,
        role,
      });
    }
  };

  const handleArchive = (projectId: string, isArchived: boolean) => {
    const mutation = isArchived ? unarchiveMutation : archiveMutation;
    mutation.mutate({ id: projectId });
  };

  const viewingDetail = Boolean(selectedProject);
  const queryErrors = viewingDetail
    ? [
        currentUserError ? currentUserQueryError : null,
        projectDetailError ? projectDetailQueryError : null,
      ]
    : [currentUserError ? currentUserQueryError : null, projectsError ? projectsQueryError : null];
  const authFailed = queryErrors.some(isAuthError);
  const forbidden = queryErrors.some(isForbiddenError);
  const notFound =
    viewingDetail && projectDetailError && httpStatusOf(projectDetailQueryError) === 404;
  const hasFetchError = viewingDetail
    ? currentUserError || projectDetailError
    : currentUserError || projectsError;
  const hasRequiredData =
    (!currentUserError || currentUser != null) &&
    (viewingDetail
      ? !projectDetailError || projectDetail != null
      : !projectsError || projects != null);
  const requiredLoading =
    currentUserLoading || (viewingDetail ? projectDetailLoading : projectsLoading);
  const requiredFetching =
    currentUserFetching || (viewingDetail ? projectDetailFetching : projectsFetching);

  const refetchRequiredData = () => {
    void refetchCurrentUser();
    if (viewingDetail) {
      void refetchProjectDetail();
      return;
    }
    void refetchProjects();
  };

  if (requiredLoading && !authFailed && !forbidden && !notFound) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  if (authFailed || forbidden || notFound || (hasFetchError && !hasRequiredData)) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">
            {authFailed
              ? 'ログインの有効期限が切れました'
              : forbidden
                ? 'このプロジェクトを見る権限がありません'
                : notFound
                  ? 'プロジェクトが見つかりません'
                  : 'プロジェクトを取得できませんでした'}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            {authFailed
              ? 'もう一度ログインしてください。'
              : forbidden
                ? '権限が必要です。プロジェクトの管理者に確認してください。'
                : notFound
                  ? '削除されたか、URLが正しくない可能性があります。'
                  : '通信状況を確認して、再読み込みしてください。'}
          </p>
          <Button
            type="button"
            onClick={() => {
              if (authFailed) {
                router.push('/login');
                return;
              }
              if (forbidden || notFound) {
                router.push('/project');
                return;
              }
              refetchRequiredData();
            }}
            disabled={requiredFetching}
          >
            {authFailed
              ? 'ログイン画面へ'
              : forbidden || notFound
                ? 'プロジェクト一覧へ'
                : '再読み込み'}
          </Button>
        </div>
      </AppLayout>
    );
  }

  const staleDataWarning = hasFetchError ? (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <span>最新のプロジェクト情報を取得できませんでした。前回取得時の内容です。</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={refetchRequiredData}
        disabled={requiredFetching}
      >
        再試行
      </Button>
    </div>
  ) : null;

  // プロジェクト詳細をインラインページとして表示（ダイアログオーバーレイなし）
  if (viewingDetail) {
    return (
      <AppLayout>
        <div className="space-y-4">
          {staleDataWarning}
          <ProjectDetailView
            projectDetail={projectDetail}
            onBack={handleDetailClose}
            onAddMemberClick={() => setMemberDialogOpen(true)}
            onRemoveMember={handleRemoveMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onArchive={handleArchive}
            canManageMembers={canManageMembers}
            canArchive={canArchiveProject}
          />
        </div>

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
                    {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                      .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {staleDataWarning}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="shrink-0 whitespace-nowrap text-3xl font-bold tracking-tight">
            プロジェクト
          </h1>
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="show-archived" className="whitespace-nowrap">
                アーカイブ表示
              </Label>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> 新規プロジェクト
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => {
              // キャンセル済みは進捗の母数に含めない
              // （アクティブな4ステータスのみを総数とする）。
              // 総数と完了数を1回のループで同時に集計する。
              let taskCount = 0;
              let doneCount = 0;
              for (const t of project.tasks ?? []) {
                if (t.status === TASK_STATUS.CANCELLED) continue;
                taskCount++;
                if (t.status === TASK_STATUS.DONE) doneCount++;
              }

              return (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  color={project.color}
                  memberCount={project.members?.length ?? 0}
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
                    {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                      .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
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

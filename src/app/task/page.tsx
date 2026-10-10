'use client';

import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import { TaskDetailDialog } from '@/component/task/task-detail-dialog';
import { TaskDialog, type TaskFormData } from '@/component/task/task-dialog';
import { Button } from '@/component/ui/button';
import { Checkbox } from '@/component/ui/checkbox';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/component/ui/dropdown-menu';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { isTaskPriority, TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/constant/priority';
import { hasPermission, isProjectMemberRole, type ProjectMemberRole } from '@/lib/constant/roles';
import { isTaskStatus, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';
import { dateOnlyToUtcStartIso } from '@/lib/date';
import { isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { classifyTaskBulkError, type TaskBulkOperation } from '@/lib/task-bulk-error';
import {
  buildTaskFiltersQueryString,
  parseTaskFiltersFromSearchParams,
} from '@/lib/task-filter-query';
import { taskToFormData } from '@/lib/task-form';
import { classifyTaskWriteError, type TaskWriteOperation } from '@/lib/task-write-error';
import { api } from '@/trpc/react';

const MAX_BULK_TASKS = 100;
const PAGE_SIZE = 100;
type BulkSelection = Map<string, number>;
type BulkSubmission = { selection: BulkSelection };
type SingleSubmission = {
  generation: number;
  pageIndex: number;
  isCurrent: () => boolean;
  routeTaskId: string | null;
  editLink: boolean;
};

function TaskPageContent() {
  const searchParams = useSearchParams();
  const urlFilters = parseTaskFiltersFromSearchParams(searchParams);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>(undefined);
  const [filterProject, setFilterProject] = useState<string>(urlFilters.project);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>(urlFilters.status);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const pageContext = `${filterProject}\u0000${filterStatus}\u0000${filterPriority}\u0000${filterAssignee}`;
  const [pagination, setPagination] = useState({ context: pageContext, index: 0 });
  const pageIndex = pagination.context === pageContext ? pagination.index : 0;
  const [selectedTasks, setSelectedTasks] = useState<BulkSelection>(new Map());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<BulkSelection | null>(null);
  const selectionVersion = useRef(0);
  const bulkSubmission = useRef<BulkSubmission | null>(null);
  const singleSubmission = useRef<SingleSubmission | null>(null);
  const formGeneration = useRef(0);
  const linkedFormTarget = useRef<string | null>(null);
  const dismissedDetailTaskId = useRef<string | null>(null);
  const authExpiredRef = useRef(false);
  const [authExpired, setAuthExpired] = useState(false);
  const handleDetailAuthExpired = useCallback(() => {
    authExpiredRef.current = true;
    setAuthExpired(true);
  }, []);
  const leavePageContext = useCallback(() => {
    formGeneration.current++;
    selectionVersion.current++;
    setSelectedTasks(new Map());
    setBulkDeleteTarget(null);
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setSelectedTask(null);
    setDetailOpen(false);
    setDialogOpen(false);
    setEditingTask(undefined);
  }, []);
  const desiredUrlFilterContext = useRef(`${urlFilters.project}\u0000${urlFilters.status}`);

  const router = useRouter();
  const pathname = usePathname();
  const taskIdParam = searchParams.get('taskId');
  const isEditLink = searchParams.get('edit') === 'true';
  useEffect(() => {
    formGeneration.current++;
    linkedFormTarget.current = null;
  }, [taskIdParam, isEditLink]);
  const {
    data: linkedTask,
    error: linkedTaskError,
    isFetching: linkedTaskFetching,
    refetch: refetchLinkedTask,
  } = api.task.getById.useQuery(
    { id: taskIdParam ?? '' },
    { enabled: !authExpired && !!taskIdParam && isEditLink, retry: shouldRetryQuery },
  );

  useEffect(() => {
    if (!taskIdParam || isEditLink || dismissedDetailTaskId.current !== taskIdParam) {
      dismissedDetailTaskId.current = null;
    }
    if (taskIdParam && !isEditLink && dismissedDetailTaskId.current !== taskIdParam) {
      setSelectedTask(taskIdParam);
      setDetailOpen(true);
    }
  }, [isEditLink, taskIdParam]);

  useEffect(() => {
    if (!isEditLink) {
      linkedFormTarget.current = null;
      return;
    }
    if (!linkedTask || linkedFormTarget.current === linkedTask.id) return;
    linkedFormTarget.current = linkedTask.id;
    formGeneration.current++;
    setEditingTask(taskToFormData(linkedTask));
    setDetailOpen(false);
    setDialogOpen(true);
  }, [isEditLink, linkedTask]);

  useEffect(() => {
    const nextUrlFilterContext = `${urlFilters.project}\u0000${urlFilters.status}`;
    if (desiredUrlFilterContext.current !== nextUrlFilterContext) {
      leavePageContext();
      setPagination({ context: '', index: 0 });
    }
    desiredUrlFilterContext.current = nextUrlFilterContext;
    setFilterProject(urlFilters.project);
    setFilterStatus(urlFilters.status);
  }, [leavePageContext, urlFilters.project, urlFilters.status]);

  useEffect(() => {
    const renderedUrlFilterContext = `${filterProject}\u0000${filterStatus}`;
    if (renderedUrlFilterContext !== desiredUrlFilterContext.current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('project');
    params.delete('status');
    if (dismissedDetailTaskId.current === taskIdParam && !isEditLink) {
      params.delete('taskId');
    }

    const filterQuery = buildTaskFiltersQueryString({
      project: filterProject,
      status: filterStatus,
    });

    if (filterQuery) {
      const filterParams = new URLSearchParams(filterQuery);
      for (const [key, value] of filterParams.entries()) {
        params.set(key, value);
      }
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [filterProject, filterStatus, isEditLink, pathname, router, searchParams, taskIdParam]);

  const utils = api.useUtils();

  const {
    data: session,
    error: sessionError,
    isSuccess: sessionLoaded,
    isFetching: sessionFetching,
    refetch: refetchSession,
  } = api.auth.getSession.useQuery(undefined, {
    enabled: !authExpired,
    retry: shouldRetryQuery,
  });
  const {
    data: tasks,
    isLoading: tasksLoading,
    isFetching: tasksFetching,
    error: tasksError,
    refetch: refetchTasks,
  } = api.task.getAll.useQuery(
    {
      projectId: filterProject === 'all' ? undefined : filterProject,
      status: filterStatus === 'all' ? undefined : filterStatus,
      priority: filterPriority === 'all' ? undefined : filterPriority,
      assigneeId: filterAssignee === 'all' ? undefined : filterAssignee,
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
    },
    { enabled: !authExpired, retry: shouldRetryQuery, refetchOnWindowFocus: false },
  );

  const {
    data: projects,
    error: projectsError,
    isFetching: projectsFetching,
    refetch: refetchProjects,
  } = api.project.getAll.useQuery(undefined, {
    enabled: !authExpired,
    retry: shouldRetryQuery,
  });
  // getProjectMembers は protectedProcedure のため、セッション確定後にのみ実行する
  const {
    data: users,
    error: usersError,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = api.search.getProjectMembers.useQuery(undefined, {
    enabled: !authExpired && !!session?.user,
    retry: shouldRetryQuery,
  });

  const queryAuthFailed =
    (sessionLoaded && session === null) ||
    [sessionError, tasksError, projectsError, usersError, linkedTaskError].some(isAuthError);
  const queryForbidden = [
    sessionError,
    tasksError,
    projectsError,
    usersError,
    linkedTaskError,
  ].some(isForbiddenError);
  useEffect(() => {
    if (!queryAuthFailed) return;
    authExpiredRef.current = true;
    setAuthExpired(true);
  }, [queryAuthFailed]);

  const taskReadFailed = !!tasksError && !isAuthError(tasksError) && !isForbiddenError(tasksError);
  const projectReadFailed =
    !!projectsError && !isAuthError(projectsError) && !isForbiddenError(projectsError);
  const sessionReadFailed =
    !!sessionError && !isAuthError(sessionError) && !isForbiddenError(sessionError);
  const usersReadFailed = !!usersError && !isAuthError(usersError) && !isForbiddenError(usersError);
  const linkedTaskReadFailed =
    !!linkedTaskError && !isAuthError(linkedTaskError) && !isForbiddenError(linkedTaskError);
  const taskReadFailedInitially = taskReadFailed && tasks === undefined;
  const projectReadFailedInitially = projectReadFailed && projects === undefined;
  const sessionReadFailedInitially = sessionReadFailed && session === undefined;
  const sessionReadDataIsStale = sessionReadFailed && session !== undefined;
  const usersReadFailedInitially = usersReadFailed && users === undefined;
  const usersReadDataIsStale = usersReadFailed && users !== undefined;
  const linkedTaskReadFailedInitially = linkedTaskReadFailed && linkedTask === undefined;
  const linkedTaskReadDataIsStale = linkedTaskReadFailed && linkedTask !== undefined;
  const requiredReadFailedInitially = taskReadFailedInitially || projectReadFailedInitially;
  const requiredReadDataIsStale =
    (taskReadFailed && tasks !== undefined) || (projectReadFailed && projects !== undefined);
  const requiredReadRetrying =
    (taskReadFailed && tasksFetching) || (projectReadFailed && projectsFetching);
  const retryRequiredReads = () => {
    const retries: Promise<unknown>[] = [];
    if (taskReadFailed) retries.push(refetchTasks());
    if (projectReadFailed) retries.push(refetchProjects());
    void Promise.all(retries);
  };
  const initialReadErrorMessage =
    taskReadFailedInitially && projectReadFailedInitially
      ? 'タスクとプロジェクトを取得できませんでした。'
      : taskReadFailedInitially
        ? 'タスクを取得できませんでした。'
        : 'プロジェクトを取得できませんでした。';
  const staleReadErrorMessage =
    taskReadFailed && projectReadFailed
      ? '最新のタスクとプロジェクトを取得できませんでした。前回取得時の内容です。'
      : taskReadFailed
        ? '最新のタスクを取得できませんでした。前回取得時の内容です。'
        : '最新のプロジェクトを取得できませんでした。前回取得時の内容です。';

  // プロジェクトごとのログインユーザー自身のロールを引けるようにする
  const myRoleByProject = useMemo(() => {
    const map = new Map<string, ProjectMemberRole>();
    const userId = session?.user?.id;
    if (!userId || !projects) {
      return map;
    }
    for (const project of projects) {
      const me = project.members?.find((member) => member.userId === userId);
      if (me && isProjectMemberRole(me.role)) {
        map.set(project.id, me.role);
      }
    }
    return map;
  }, [projects, session?.user?.id]);

  const canEditProject = useCallback(
    (projectId: string) => {
      const role = myRoleByProject.get(projectId);
      return role ? hasPermission(role, 'canEdit') : false;
    },
    [myRoleByProject],
  );

  const canDeleteProject = useCallback(
    (projectId: string) => {
      const role = myRoleByProject.get(projectId);
      return role ? hasPermission(role, 'canDelete') : false;
    },
    [myRoleByProject],
  );

  // 作成可能なプロジェクト（canEdit）のみをタスク作成ダイアログに渡す
  const editableProjects = useMemo(
    () => projects?.filter((project) => canEditProject(project.id)) ?? [],
    [projects, canEditProject],
  );

  const closeTaskDialog = useCallback(() => {
    formGeneration.current++;
    setDialogOpen(false);
    setEditingTask(undefined);

    if (isEditLink) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('taskId');
      params.delete('edit');
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [isEditLink, pathname, router, searchParams]);

  const ownsSubmittedLifetime = (submitted: SingleSubmission | null) =>
    !authExpiredRef.current &&
    submitted?.generation === formGeneration.current &&
    submitted.pageIndex === pageIndex &&
    submitted.routeTaskId === taskIdParam &&
    submitted.editLink === isEditLink;

  const finishSubmittedForm = (
    submitted: SingleSubmission | null,
    operation: 'create' | 'update',
    target: { id: string; title: string | undefined },
  ) => {
    const canClose = ownsSubmittedLifetime(submitted) && submitted?.isCurrent();
    if (canClose) closeTaskDialog();
    if (authExpiredRef.current) return;
    const name = target.title ? `「${target.title}」` : '先ほど送信したタスク';
    toast.success(`${name}を${operation === 'create' ? '作成' : '更新'}しました。`);
    if (canClose || !dialogOpen) return;
    // 別の対象へ保存案内を出さず、残った入力から再操作する際の注意を伝えるためです。
    if (operation === 'create' && !editingTask?.id) {
      toast(
        '送信後に入力を変えた場合、その変更は保存されていません。このまま作成すると別のタスクになります。',
      );
    } else if (operation === 'update' && editingTask?.id === target.id) {
      toast(
        '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから、タスク編集画面を閉じて開き直し、もう一度保存してください。',
      );
    }
  };
  const handleSingleError = async (
    error: unknown,
    operation: TaskWriteOperation,
    ids: string[],
  ) => {
    const failure = classifyTaskWriteError(error, operation);
    if (failure.kind === 'auth') {
      handleDetailAuthExpired();
      return;
    }
    toast.error(failure.message);
    await refreshTaskTargets(ids, true, true);
  };
  const singleMutationOptions = {
    retry: false as const,
    onMutate: () => singleSubmission.current,
    onSettled: (
      _data: unknown,
      _error: unknown,
      _variables: unknown,
      submitted: SingleSubmission | null | undefined,
    ) => {
      if (singleSubmission.current === submitted) singleSubmission.current = null;
    },
  };
  const createMutation = api.task.create.useMutation({
    ...singleMutationOptions,
    onSuccess: async (data, variables, submitted) => {
      finishSubmittedForm(submitted, 'create', { id: data.id, title: variables.title });
      await refreshTaskTargets([data.id], false, true);
    },
    onError: (error) => handleSingleError(error, 'create', []),
  });
  const updateMutation = api.task.update.useMutation({
    ...singleMutationOptions,
    onSuccess: async (_data, variables, submitted) => {
      finishSubmittedForm(submitted, 'update', { id: variables.id, title: variables.title });
      await refreshTaskTargets([variables.id], false, true);
    },
    onError: (error, variables) => handleSingleError(error, 'update', [variables.id]),
  });
  const deleteMutation = api.task.delete.useMutation({
    ...singleMutationOptions,
    onSuccess: async (_data, variables) => {
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      setSelectedTask((current) => (current === variables.id ? null : current));
      setSelectedTasks((current) => {
        const next = new Map(current);
        next.delete(variables.id);
        return next;
      });
      await refreshTaskTargets([variables.id], false);
    },
    onError: (error, variables) => handleSingleError(error, 'delete', [variables.id]),
  });
  const singlePending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const refreshTaskTargets = async (
    ids: string[],
    refreshPermissions: boolean,
    reportDetailFailure = false,
  ) => {
    const filters = {
      refetchType: authExpiredRef.current ? ('none' as const) : ('active' as const),
    };
    try {
      const updates = [
        utils.task.getAll.invalidate(undefined, filters, { throwOnError: true }),
        ...ids.map((id) =>
          utils.task.getById.invalidate({ id }, filters, { throwOnError: reportDetailFailure }),
        ),
      ];
      if (refreshPermissions)
        updates.push(utils.project.getAll.invalidate(undefined, filters, { throwOnError: true }));
      await Promise.all(updates);
    } catch (error) {
      if (isAuthError(error)) {
        authExpiredRef.current = true;
        setAuthExpired(true);
        return;
      }
      // 書き込み結果と表示更新の失敗を混同しないためです。
      console.error('操作後の表示更新に失敗しました。', error);
      if (!authExpiredRef.current)
        toast.error('最新の表示を取得できませんでした。再表示して操作結果を確認してください。');
    }
  };

  const bulkMutationOptions = (operation: TaskBulkOperation) => ({
    retry: false as const,
    onMutate: () => bulkSubmission.current,
    onSuccess: (_data: unknown, variables: { ids: string[] }, submitted: BulkSubmission | null) => {
      void refreshTaskTargets(variables.ids, false);
      if (authExpiredRef.current || !submitted) return;
      setSelectedTasks((previous) => {
        const next = new Map(previous);
        for (const id of variables.ids) {
          // 送信後に同じ項目を選び直した意思を古い応答で消さないためです。
          if (operation === 'delete' || next.get(id) === submitted.selection.get(id))
            next.delete(id);
        }
        return next;
      });
      if (operation === 'delete') {
        setBulkDeleteTarget(null);
        // 削除済みの内容を再取得失敗時のキャッシュから表示し続けないためです。
        setSelectedTask((current) => (current && variables.ids.includes(current) ? null : current));
      }
    },
    onError: (error: unknown, variables: { ids: string[] }) => {
      const result = classifyTaskBulkError(error, operation);
      if (result.kind === 'auth') {
        authExpiredRef.current = true;
        setAuthExpired(true);
        return;
      }
      toast.error(result.message);
      void refreshTaskTargets(variables.ids, true);
    },
    onSettled: () => {
      bulkSubmission.current = null;
    },
  });

  const bulkCompleteMutation = api.task.bulkComplete.useMutation(bulkMutationOptions('complete'));
  const bulkDeleteMutation = api.task.bulkDelete.useMutation(bulkMutationOptions('delete'));
  const bulkUpdateStatusMutation = api.task.bulkUpdateStatus.useMutation(
    bulkMutationOptions('status'),
  );
  const bulkPending =
    bulkCompleteMutation.isPending ||
    bulkDeleteMutation.isPending ||
    bulkUpdateStatusMutation.isPending;

  const handleCreate = () => {
    if (authExpiredRef.current) return;
    formGeneration.current++;
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (taskId: string) => {
    if (authExpiredRef.current) return;
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      formGeneration.current++;
      setEditingTask(taskToFormData(task));
      setDialogOpen(true);
    }
  };

  const handleDelete = (taskId: string) => {
    if (singleSubmission.current || singlePending || authExpiredRef.current) return;
    setDeleteTargetId(taskId);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: TaskFormData, isCurrent: () => boolean = () => true) => {
    if (
      singleSubmission.current ||
      singlePending ||
      authExpiredRef.current ||
      !dialogOpen ||
      !isCurrent()
    )
      return;
    if (!data.id && !session?.user?.id) {
      handleDetailAuthExpired();
      return;
    }
    singleSubmission.current = {
      generation: formGeneration.current,
      pageIndex,
      isCurrent,
      routeTaskId: taskIdParam,
      editLink: isEditLink,
    };
    if (data.id) {
      updateMutation.mutate({
        id: data.id,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? dateOnlyToUtcStartIso(data.dueDate) : null,
        estimatedHours: data.estimatedHours ?? null,
        projectId: data.projectId,
        assigneeId: data.assigneeId || null,
        ...(data.expectedUpdatedAt !== undefined && {
          expectedUpdatedAt: data.expectedUpdatedAt,
        }),
      });
    } else {
      createMutation.mutate({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? dateOnlyToUtcStartIso(data.dueDate) : undefined,
        estimatedHours: data.estimatedHours,
        projectId: data.projectId,
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
    if (taskIdParam && !isEditLink) {
      dismissedDetailTaskId.current = taskIdParam;
      const params = new URLSearchParams(searchParams.toString());
      params.delete('taskId');
      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  };

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const version = ++selectionVersion.current;
    setSelectedTasks((previous) => {
      const next = new Map(previous);
      checked ? next.set(taskId, version) : next.delete(taskId);
      return next;
    });
  };

  const moveToPage = (nextPage: number) => {
    if (tasksFetching || nextPage < 0 || nextPage === pageIndex) return;
    leavePageContext();
    setPagination({ context: pageContext, index: nextPage });
  };

  const resetPageForFilter = () => {
    leavePageContext();
    setPagination({ context: '', index: 0 });
  };

  // 編集も削除もできないタスク（閲覧のみ）は一括操作の対象から除外する
  const selectableTasks = useMemo(
    () => tasks?.filter((t) => canEditProject(t.projectId) || canDeleteProject(t.projectId)) ?? [],
    [tasks, canEditProject, canDeleteProject],
  );

  const selectedTaskList = useMemo(
    () => tasks?.filter((t) => selectedTasks.has(t.id)) ?? [],
    [tasks, selectedTasks],
  );

  const canCompleteSelected =
    selectedTaskList.length > 0 && selectedTaskList.every((t) => canEditProject(t.projectId));
  const canDeleteSelected =
    selectedTaskList.length > 0 && selectedTaskList.every((t) => canDeleteProject(t.projectId));

  const handleSelectAll = (checked: boolean) => {
    const version = ++selectionVersion.current;
    setSelectedTasks((previous) =>
      checked
        ? new Map(selectableTasks.map((task) => [task.id, previous.get(task.id) ?? version]))
        : new Map(),
    );
  };

  const currentBulkSelection = () =>
    new Map(selectedTaskList.map((task) => [task.id, selectedTasks.get(task.id) ?? 0]));
  const beginBulk = (selection: BulkSelection) => {
    if (
      authExpiredRef.current ||
      bulkPending ||
      bulkSubmission.current ||
      selection.size === 0 ||
      selection.size > MAX_BULK_TASKS
    )
      return false;
    bulkSubmission.current = { selection };
    return true;
  };
  const tooManySelected = selectedTaskList.length > MAX_BULK_TASKS;

  // 非表示の選択を送信せず、確認画面では同意した対象を固定するためです。
  const handleBulkComplete = () => {
    if (!canCompleteSelected) return;
    const selection = currentBulkSelection();
    if (beginBulk(selection)) bulkCompleteMutation.mutate({ ids: [...selection.keys()] });
  };

  const handleBulkDelete = () => {
    if (
      authExpiredRef.current ||
      bulkPending ||
      bulkSubmission.current ||
      !canDeleteSelected ||
      tooManySelected
    )
      return;
    setBulkDeleteTarget(currentBulkSelection());
  };

  const handleBulkUpdateStatus = (status: TaskStatus) => {
    if (!canCompleteSelected) return;
    const selection = currentBulkSelection();
    if (beginBulk(selection))
      bulkUpdateStatusMutation.mutate({ ids: [...selection.keys()], status });
  };

  const selectAllState =
    selectableTasks.length > 0
      ? selectedTaskList.length === 0
        ? false
        : selectedTaskList.length === selectableTasks.length
          ? true
          : 'indeterminate'
      : false;

  if (authExpired || queryAuthFailed) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <p role="alert">ログインの有効期限が切れました。もう一度ログインしてください。</p>
          <Button onClick={() => router.push('/login')}>ログイン画面へ</Button>
        </div>
      </AppLayout>
    );
  }

  if (queryForbidden) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <p role="alert">タスク情報を表示する権限がありません。</p>
        </div>
      </AppLayout>
    );
  }

  if (sessionReadFailedInitially) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p role="alert">ログイン情報を取得できませんでした。</p>
          <Button type="button" onClick={() => void refetchSession()} disabled={sessionFetching}>
            再試行
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (requiredReadFailedInitially) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p role="alert">{initialReadErrorMessage}</p>
          <Button type="button" onClick={retryRequiredReads} disabled={requiredReadRetrying}>
            再試行
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {tasksLoading ? (
        <PageLoadingSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">タスク</h1>
              {selectedTaskList.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({selectedTaskList.length}件選択中)
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canCompleteSelected && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={bulkPending || tooManySelected}
                    onClick={handleBulkComplete}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" /> 完了にする
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={bulkPending || tooManySelected}
                      >
                        ステータス変更
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <DropdownMenuItem
                          key={value}
                          disabled={bulkPending || tooManySelected}
                          onClick={() => {
                            if (isTaskStatus(value)) handleBulkUpdateStatus(value);
                          }}
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {canDeleteSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive sm:w-auto"
                  disabled={bulkPending || tooManySelected}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> 削除
                </Button>
              )}
              {editableProjects.length > 0 && (
                <Button size="sm" className="w-full sm:w-auto" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> 新規タスク
                </Button>
              )}
            </div>
          </div>

          {requiredReadDataIsStale && (
            <div
              className="flex flex-col gap-3 rounded-md border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <span>{staleReadErrorMessage}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retryRequiredReads}
                disabled={requiredReadRetrying}
              >
                再試行
              </Button>
            </div>
          )}

          {sessionReadDataIsStale && (
            <div
              className="flex flex-col gap-3 rounded-md border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <span>
                最新のログイン情報を取得できませんでした。前回取得時の権限で表示しています。
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchSession()}
                disabled={sessionFetching}
              >
                再試行
              </Button>
            </div>
          )}

          {(usersReadFailedInitially || usersReadDataIsStale) && (
            <div
              className="flex flex-col gap-3 rounded-md border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <span>
                {usersReadDataIsStale
                  ? '最新の担当者候補を取得できませんでした。前回取得時の候補です。'
                  : '担当者候補を取得できませんでした。'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchUsers()}
                disabled={usersFetching}
              >
                再試行
              </Button>
            </div>
          )}

          {(linkedTaskReadFailedInitially || linkedTaskReadDataIsStale) && (
            <div
              className="flex flex-col gap-3 rounded-md border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <span>
                {linkedTaskReadDataIsStale
                  ? '最新の編集対象タスクを取得できませんでした。前回取得時の内容です。'
                  : '編集するタスクを取得できませんでした。'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchLinkedTask()}
                disabled={linkedTaskFetching}
              >
                再試行
              </Button>
            </div>
          )}

          {tooManySelected && (
            <p role="alert">一括操作は100件までです。選択する件数を減らしてください。</p>
          )}
          {bulkPending && (
            <p role="status">一括操作の結果を待っています。別の一括操作は完了後に実行できます。</p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
            {selectableTasks.length > 0 && (
              <div className="flex items-center space-x-2 shrink-0">
                <Checkbox
                  id="select-all"
                  checked={selectAllState}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label="表示中のタスクをすべて選択"
                />
                <Label htmlFor="select-all" className="whitespace-nowrap">
                  表示中をすべて選択
                </Label>
              </div>
            )}

            <div className="task-filter-grid ml-auto">
              <div>
                <Label htmlFor="task-project-filter" className="sr-only">
                  プロジェクトで絞り込み
                </Label>
                <Select
                  value={filterProject}
                  onValueChange={(value) => {
                    if (value === filterProject) return;
                    desiredUrlFilterContext.current = `${value}\u0000${filterStatus}`;
                    resetPageForFilter();
                    setFilterProject(value);
                  }}
                >
                  <SelectTrigger id="task-project-filter" aria-label="プロジェクトで絞り込み">
                    <SelectValue placeholder="すべてのプロジェクト" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのプロジェクト</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-status-filter" className="sr-only">
                  ステータスで絞り込み
                </Label>
                <Select
                  value={filterStatus}
                  onValueChange={(value) => {
                    if ((value === 'all' || isTaskStatus(value)) && value !== filterStatus) {
                      desiredUrlFilterContext.current = `${filterProject}\u0000${value}`;
                      resetPageForFilter();
                      setFilterStatus(value);
                    }
                  }}
                >
                  <SelectTrigger id="task-status-filter" aria-label="ステータスで絞り込み">
                    <SelectValue placeholder="すべてのステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのステータス</SelectItem>
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-priority-filter" className="sr-only">
                  優先度で絞り込み
                </Label>
                <Select
                  value={filterPriority}
                  onValueChange={(value) => {
                    if ((value === 'all' || isTaskPriority(value)) && value !== filterPriority) {
                      resetPageForFilter();
                      setFilterPriority(value);
                    }
                  }}
                >
                  <SelectTrigger id="task-priority-filter" aria-label="優先度で絞り込み">
                    <SelectValue placeholder="すべての優先度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての優先度</SelectItem>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-assignee-filter" className="sr-only">
                  担当者で絞り込み
                </Label>
                <Select
                  value={filterAssignee}
                  onValueChange={(value) => {
                    if (value === filterAssignee) return;
                    resetPageForFilter();
                    setFilterAssignee(value);
                  }}
                >
                  <SelectTrigger id="task-assignee-filter" aria-label="担当者で絞り込み">
                    <SelectValue placeholder="すべての担当者" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての担当者</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => {
                const taskCanEdit = canEditProject(task.projectId);
                const taskCanDelete = canDeleteProject(task.projectId);
                return (
                  <div key={task.id} className="flex gap-2 items-start h-full">
                    {(taskCanEdit || taskCanDelete) && (
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={(checked) => handleTaskSelect(task.id, checked === true)}
                        className="mt-4"
                        aria-label={`${task.title}を選択`}
                      />
                    )}
                    <div className="flex-1 min-w-0 h-full">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        status={task.status}
                        priority={task.priority}
                        dueDate={task.dueDate}
                        assignee={task.assignee}
                        timeSpentMinutes={task.timeSpentMinutes}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onClick={handleTaskClick}
                        canEdit={taskCanEdit}
                        canDelete={taskCanDelete}
                      />
                    </div>
                  </div>
                );
              })
            ) : pageIndex > 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p>このページにはタスクがありません。</p>
                <p>前のページへ戻ってください。</p>
              </div>
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p>タスクが見つかりません。</p>
                {filterProject === 'all' &&
                  filterStatus === 'all' &&
                  filterPriority === 'all' &&
                  filterAssignee === 'all' && <p>最初のタスクを作成しましょう！</p>}
              </div>
            )}
          </div>

          {(pageIndex > 0 || (tasks?.length ?? 0) === PAGE_SIZE) && (
            <nav
              className="flex items-center justify-center gap-3"
              aria-label="タスク一覧のページ移動"
            >
              <Button
                variant="outline"
                disabled={tasksFetching || pageIndex === 0}
                onClick={() => moveToPage(pageIndex - 1)}
              >
                前へ
              </Button>
              <span className="text-sm text-muted-foreground">{pageIndex + 1}ページ目</span>
              <Button
                variant="outline"
                disabled={tasksFetching || (tasks?.length ?? 0) < PAGE_SIZE}
                onClick={() => moveToPage(pageIndex + 1)}
              >
                次へ
              </Button>
            </nav>
          )}

          <TaskDialog
            open={dialogOpen}
            onClose={closeTaskDialog}
            onSubmit={handleSubmit}
            isPending={singlePending}
            initialData={editingTask}
            projects={editableProjects}
          />

          <TaskDetailDialog
            open={detailOpen && selectedTask !== null}
            taskId={selectedTask}
            onClose={handleDetailClose}
            onAuthExpired={handleDetailAuthExpired}
          />
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (
            deleteTargetId &&
            !singleSubmission.current &&
            !singlePending &&
            !authExpiredRef.current
          ) {
            singleSubmission.current = {
              generation: formGeneration.current,
              pageIndex,
              isCurrent: () => false,
              routeTaskId: taskIdParam,
              editLink: isEditLink,
            };
            deleteMutation.mutate({ id: deleteTargetId });
          }
        }}
        isPending={singlePending}
        closeOnConfirm={false}
      />

      <DeleteConfirmDialog
        open={bulkDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteTarget(null);
        }}
        onConfirm={() => {
          if (bulkDeleteTarget && beginBulk(bulkDeleteTarget)) {
            bulkDeleteMutation.mutate({ ids: [...bulkDeleteTarget.keys()] });
          }
        }}
        isPending={bulkPending}
        closeOnConfirm={false}
        title={`${bulkDeleteTarget?.size ?? 0}件のタスクを削除しますか？`}
      />
    </AppLayout>
  );
}

export default function TaskPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <TaskPageContent />
    </Suspense>
  );
}

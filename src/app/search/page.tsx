'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import { Button } from '@/component/ui/button';
import { Card, CardContent } from '@/component/ui/card';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Separator } from '@/component/ui/separator';
import { isTaskPriority, TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { hasPermission, isProjectMemberRole, type ProjectMemberRole } from '@/lib/constant/roles';
import { isTaskStatus, TASK_STATUS_LABELS } from '@/lib/constant/status';
import { dateOnlyToUtcEndIso, dateOnlyToUtcStartIso } from '@/lib/date';
import { isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { applySearchParamsToValues, buildSearchParamsFromValues } from '@/lib/search-filters';
import { classifyTaskWriteError } from '@/lib/task-write-error';
import { api } from '@/trpc/react';

const TASK_STATUS_VALUES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'] as const;
const TASK_PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const searchFormSchema = z.object({
  keyword: z.string().default(''),
  projectId: z.string().default('all'),
  status: z.enum(['all', ...TASK_STATUS_VALUES]).default('all'),
  priority: z.enum(['all', ...TASK_PRIORITY_VALUES]).default('all'),
  assignedTo: z.string().default('all'),
  dateFrom: z.string().default(''),
  dateTo: z.string().default(''),
});
type SearchFormValues = z.infer<typeof searchFormSchema>;

type SupportQueryWarningProps = {
  ariaLabel: string;
  message: string;
  retryLabel: string;
  hasCachedData: boolean;
  isFetching: boolean;
  onRetry: () => void;
};

function SupportQueryWarning({
  ariaLabel,
  message,
  retryLabel,
  hasCachedData,
  isFetching,
  onRetry,
}: SupportQueryWarningProps) {
  return (
    <div
      role="alert"
      aria-label={ariaLabel}
      className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <span>
        {message}
        {hasCachedData
          ? '前回取得時の内容を表示しています。'
          : '選択肢や操作権限は利用できません。'}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>
        {retryLabel}
      </Button>
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // 書き込み時に401を受けた場合、読み取り系の判定を待たず即座に期限切れとして扱い、
  // それ以降の保護操作を止める。ref は再描画前の同期ガード用。
  const [authExpired, setAuthExpired] = useState(false);
  const authExpiredRef = useRef(false);
  const markAuthExpired = () => {
    authExpiredRef.current = true;
    setAuthExpired(true);
  };

  const defaultSearchValues: SearchFormValues = {
    keyword: '',
    projectId: 'all',
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    dateFrom: '',
    dateTo: '',
  };

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: searchFormSchema.parse(
      applySearchParamsToValues(new URLSearchParams(searchParams.toString()), defaultSearchValues),
    ),
  });

  const formValues = form.watch();
  // テキスト入力のkeywordのみをデバウンスする（セレクト・日付の変更は即時反映）。
  // 空文字（クリアや全消し）は即時に反映し、入力中のみ300msデバウンスする。
  // useDebounce(値) を使うとクリア直後に高速で再入力した際、保留中の古いタイマー値が
  // 一時的に復活してしまうため、状態を直接管理して古い値の混入を防ぐ。
  const [debouncedKeyword, setDebouncedKeyword] = useState(formValues.keyword);

  useEffect(() => {
    if (formValues.keyword === '') {
      setDebouncedKeyword('');
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedKeyword(formValues.keyword);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [formValues.keyword]);

  const searchValues = { ...formValues, keyword: debouncedKeyword };

  const shouldSearch =
    !!searchValues.keyword ||
    searchValues.projectId !== 'all' ||
    searchValues.status !== 'all' ||
    searchValues.priority !== 'all' ||
    searchValues.assignedTo !== 'all' ||
    !!searchValues.dateFrom ||
    !!searchValues.dateTo;

  const {
    data: session,
    isError: sessionErrorPresent,
    isFetching: sessionFetching,
    error: sessionError,
    failureReason: sessionFailure,
    refetch: refetchSession,
  } = api.auth.getSession.useQuery(undefined, { retry: shouldRetryQuery });
  const {
    data: projects,
    isError: projectOptionsErrorPresent,
    isFetching: projectOptionsFetching,
    error: projectOptionsError,
    failureReason: projectOptionsFailure,
    refetch: refetchProjectOptions,
  } = api.search.getUserProjects.useQuery(undefined, { retry: shouldRetryQuery });
  const {
    data: memberProjects,
    isError: memberProjectsErrorPresent,
    isFetching: memberProjectsFetching,
    error: memberProjectsError,
    failureReason: memberProjectsFailure,
    refetch: refetchMemberProjects,
  } = api.project.getAll.useQuery(undefined, { retry: shouldRetryQuery });
  const {
    data: users,
    isError: assigneeOptionsErrorPresent,
    isFetching: assigneeOptionsFetching,
    error: assigneeOptionsError,
    failureReason: assigneeOptionsFailure,
    refetch: refetchAssigneeOptions,
  } = api.search.getProjectMembers.useQuery(undefined, { retry: shouldRetryQuery });

  const supportAuthFailed =
    authExpired ||
    session === null ||
    [
      sessionError,
      sessionFailure,
      projectOptionsError,
      projectOptionsFailure,
      memberProjectsError,
      memberProjectsFailure,
      assigneeOptionsError,
      assigneeOptionsFailure,
    ].some(isAuthError);
  const supportForbidden = [
    sessionError,
    sessionFailure,
    projectOptionsError,
    projectOptionsFailure,
    memberProjectsError,
    memberProjectsFailure,
    assigneeOptionsError,
    assigneeOptionsFailure,
  ].some(isForbiddenError);
  const projectOptionsProtected = [projectOptionsError, projectOptionsFailure].some(
    (error) => isAuthError(error) || isForbiddenError(error),
  );
  const assigneeOptionsProtected = [assigneeOptionsError, assigneeOptionsFailure].some(
    (error) => isAuthError(error) || isForbiddenError(error),
  );
  const permissionDataUnavailable =
    sessionErrorPresent || memberProjectsErrorPresent || supportForbidden;
  const supportWriteBlocked = supportAuthFailed || permissionDataUnavailable;

  // プロジェクトごとのログインユーザー自身のロールを引けるようにする
  const myRoleByProject = useMemo(() => {
    const map = new Map<string, ProjectMemberRole>();
    const userId = session?.user?.id;
    if (!userId || !memberProjects || permissionDataUnavailable) {
      return map;
    }
    for (const project of memberProjects) {
      const me = project.members?.find((member) => member.userId === userId);
      if (me && isProjectMemberRole(me.role)) {
        map.set(project.id, me.role);
      }
    }
    return map;
  }, [memberProjects, permissionDataUnavailable, session?.user?.id]);

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
  const {
    data: searchResults,
    isLoading,
    isError: searchErrorPresent,
    isFetching: searchFetching,
    error: searchError,
    refetch: refetchSearch,
  } = api.search.search.useQuery(
    {
      keyword: searchValues.keyword || undefined,
      projectId: searchValues.projectId !== 'all' ? searchValues.projectId : undefined,
      status: searchValues.status,
      priority: searchValues.priority,
      assignedTo: searchValues.assignedTo !== 'all' ? searchValues.assignedTo : undefined,
      dateFrom: searchValues.dateFrom ? dateOnlyToUtcStartIso(searchValues.dateFrom) : undefined,
      dateTo: searchValues.dateTo ? dateOnlyToUtcEndIso(searchValues.dateTo) : undefined,
    },
    {
      enabled: shouldSearch,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  );

  const authFailed = isAuthError(searchError);
  const forbidden = isForbiddenError(searchError);
  const protectedSearchError = searchErrorPresent && (authFailed || forbidden);
  const queryWriteBlocked = supportWriteBlocked || protectedSearchError;

  const canDeleteTask = useCallback(
    (taskId: string) => {
      const task = searchResults?.tasks.find((item) => item.id === taskId);
      return task ? canDeleteProject(task.projectId) : false;
    },
    [canDeleteProject, searchResults?.tasks],
  );
  const canEditTask = useCallback(
    (taskId: string) => {
      const task = searchResults?.tasks.find((item) => item.id === taskId);
      return task ? canEditProject(task.projectId) : false;
    },
    [canEditProject, searchResults?.tasks],
  );
  const queryWriteBlockedRef = useRef(queryWriteBlocked);
  const canDeleteTaskRef = useRef(canDeleteTask);
  const canEditTaskRef = useRef(canEditTask);
  queryWriteBlockedRef.current = queryWriteBlocked;
  canDeleteTaskRef.current = canDeleteTask;
  canEditTaskRef.current = canEditTask;

  // URL → フォーム: ブラウザの戻る/進む・共有リンクからの復元用。
  // 自前の「フォーム → URL」同期で生じた変更時は値が一致するため reset をスキップし、無限ループと入力中のカーソル飛びを防ぐ。
  useEffect(() => {
    const currentParams = buildSearchParamsFromValues(form.getValues()).toString();
    if (currentParams === searchParams.toString()) {
      return;
    }

    const nextValues = applySearchParamsToValues(
      new URLSearchParams(searchParams.toString()),
      form.getValues(),
    );

    form.reset(searchFormSchema.parse(nextValues));
  }, [searchParams, form]);

  // フォーム → URL: keywordはデバウンス後、その他フィルタは即時にURLへ反映し、
  // 共有・リロード・戻る/進むで条件を保持する。履歴を汚さないよう push ではなく replace を使う。
  // 依存配列はオブジェクト参照ではなく各プリミティブ値を個別に指定し、不要な再実行を防ぐ。
  useEffect(() => {
    const nextParams = buildSearchParamsFromValues({
      keyword: debouncedKeyword,
      projectId: formValues.projectId,
      status: formValues.status,
      priority: formValues.priority,
      assignedTo: formValues.assignedTo,
      dateFrom: formValues.dateFrom,
      dateTo: formValues.dateTo,
    }).toString();
    if (nextParams === searchParams.toString()) {
      return;
    }

    router.replace(nextParams ? `/search?${nextParams}` : '/search', { scroll: false });
  }, [
    debouncedKeyword,
    formValues.projectId,
    formValues.status,
    formValues.priority,
    formValues.assignedTo,
    formValues.dateFrom,
    formValues.dateTo,
    router,
    searchParams,
  ]);

  const handleClear = () => {
    form.reset({
      keyword: '',
      projectId: 'all',
      status: 'all',
      priority: 'all',
      assignedTo: 'all',
      dateFrom: '',
      dateTo: '',
    });
    router.push('/search');
  };

  const handleTaskClick = (taskId: string) => {
    router.push(`/task?taskId=${taskId}`);
  };

  const handleTaskEdit = (taskId: string) => {
    if (authExpiredRef.current || queryWriteBlockedRef.current || !canEditTaskRef.current(taskId))
      return;
    router.push(`/task?taskId=${taskId}&edit=true`);
  };

  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  const deleteSubmission = useRef<{ taskId: string } | null>(null);
  const deleteMutation = api.task.delete.useMutation({
    retry: false,
    onMutate: () => deleteSubmission.current,
    onSuccess: (_data, variables, submitted) => {
      // 成功時だけ、送信した本人の確認ダイアログを閉じる。
      // 別タスクの確認やキャンセル済みの確認を成功応答で閉じない。
      if (submitted && submitted.taskId === variables.id) {
        setDeleteTaskConfirm((current) =>
          current.taskId === variables.id ? { open: false, taskId: null } : current,
        );
      }
      void utils.search.search.invalidate();
    },
    onError: (error) => {
      const failure = classifyTaskWriteError(error, 'delete');
      if (failure.kind === 'auth') {
        markAuthExpired();
        return;
      }
      toast.error(failure.message);
      // 失敗と結果不明（ネットワーク断等でサーバー応答を受け取れない）を分けず、
      // どちらも一覧を再取得して実際の削除結果を画面に反映する。
      void utils.search.search.invalidate();
    },
    onSettled: (_data, _error, _variables, submitted) => {
      if (deleteSubmission.current === submitted) deleteSubmission.current = null;
    },
  });

  useEffect(() => {
    if (
      deleteTaskConfirm.open &&
      (queryWriteBlocked || !deleteTaskConfirm.taskId || !canDeleteTask(deleteTaskConfirm.taskId))
    ) {
      setDeleteTaskConfirm({ open: false, taskId: null });
    }
  }, [canDeleteTask, deleteTaskConfirm, queryWriteBlocked]);

  const handleTaskDelete = (taskId: string) => {
    if (
      authExpiredRef.current ||
      queryWriteBlockedRef.current ||
      !canDeleteTaskRef.current(taskId) ||
      deleteSubmission.current ||
      deleteMutation.isPending
    ) {
      return;
    }
    setDeleteTaskConfirm({ open: true, taskId });
  };

  const handleSearchErrorAction = () => {
    if (authFailed) {
      router.push('/login');
      return;
    }
    if (forbidden) {
      handleClear();
      return;
    }
    void refetchSearch();
  };

  const handleKeywordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    setDebouncedKeyword(form.getValues('keyword'));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">検索</h1>
          <p className="text-muted-foreground">タスクやプロジェクトを検索します</p>
        </div>

        <Card className="max-w-5xl">
          <CardContent className="pt-6 sm:pt-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="keyword">キーワード</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="keyword"
                    placeholder="タスク名、説明で検索..."
                    className="pl-8"
                    {...form.register('keyword')}
                    onKeyDown={handleKeywordKeyDown}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project">プロジェクト</Label>
                  <Select
                    value={formValues.projectId}
                    onValueChange={(v) => form.setValue('projectId', v)}
                    disabled={
                      supportAuthFailed ||
                      supportForbidden ||
                      (projectOptionsErrorPresent && !projects)
                    }
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="すべてのプロジェクト" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべてのプロジェクト</SelectItem>
                      {!supportAuthFailed &&
                        !supportForbidden &&
                        !projectOptionsProtected &&
                        projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">ステータス</Label>
                  <Select
                    value={formValues.status}
                    onValueChange={(value) => {
                      if (isTaskStatus(value)) {
                        form.setValue('status', value);
                      } else if (value === 'all') {
                        form.setValue('status', 'all');
                      }
                    }}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">優先度</Label>
                  <Select
                    value={formValues.priority}
                    onValueChange={(value) => {
                      if (isTaskPriority(value)) {
                        form.setValue('priority', value);
                      } else if (value === 'all') {
                        form.setValue('priority', 'all');
                      }
                    }}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">担当者</Label>
                  <Select
                    value={formValues.assignedTo}
                    onValueChange={(v) => form.setValue('assignedTo', v)}
                    disabled={
                      supportAuthFailed ||
                      supportForbidden ||
                      (assigneeOptionsErrorPresent && !users)
                    }
                  >
                    <SelectTrigger id="assignedTo">
                      <SelectValue placeholder="すべての担当者" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべての担当者</SelectItem>
                      {!supportAuthFailed &&
                        !supportForbidden &&
                        !assigneeOptionsProtected &&
                        users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dateFrom">期限：開始日</Label>
                  <Input id="dateFrom" type="date" {...form.register('dateFrom')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dateTo">期限：終了日</Label>
                  <Input id="dateTo" type="date" {...form.register('dateTo')} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleClear}>
                  クリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!supportAuthFailed && !supportForbidden && projectOptionsErrorPresent ? (
          <SupportQueryWarning
            ariaLabel="プロジェクトの選択肢を取得できませんでした"
            message="プロジェクトの選択肢を取得できませんでした。"
            retryLabel="プロジェクト選択肢を再試行"
            hasCachedData={projects !== undefined}
            isFetching={projectOptionsFetching}
            onRetry={() => void refetchProjectOptions()}
          />
        ) : null}
        {!supportAuthFailed && !supportForbidden && assigneeOptionsErrorPresent ? (
          <SupportQueryWarning
            ariaLabel="担当者の選択肢を取得できませんでした"
            message="担当者の選択肢を取得できませんでした。"
            retryLabel="担当者選択肢を再試行"
            hasCachedData={users !== undefined}
            isFetching={assigneeOptionsFetching}
            onRetry={() => void refetchAssigneeOptions()}
          />
        ) : null}
        {!supportAuthFailed && !supportForbidden && sessionErrorPresent ? (
          <SupportQueryWarning
            ariaLabel="操作権限を確認できませんでした"
            message="ログインユーザーの操作権限を確認できませんでした。"
            retryLabel="ログインユーザーを再試行"
            hasCachedData={session !== undefined}
            isFetching={sessionFetching}
            onRetry={() => void refetchSession()}
          />
        ) : null}
        {!supportAuthFailed && !supportForbidden && memberProjectsErrorPresent ? (
          <SupportQueryWarning
            ariaLabel="操作権限を確認できませんでした"
            message="プロジェクトの操作権限を確認できませんでした。"
            retryLabel="プロジェクト権限を再試行"
            hasCachedData={memberProjects !== undefined}
            isFetching={memberProjectsFetching}
            onRetry={() => void refetchMemberProjects()}
          />
        ) : null}
        {!supportAuthFailed && supportForbidden ? (
          <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-center">
            <p className="font-medium">検索条件に必要な情報を見る権限がありません</p>
            <p className="text-sm text-muted-foreground">
              選択肢やタスクの操作権限は利用できません。
            </p>
          </div>
        ) : null}

        {supportAuthFailed ? (
          <div className="space-y-4 rounded-lg border border-destructive/40 p-6 text-center">
            <p className="font-medium">ログインの有効期限が切れました</p>
            <Button type="button" variant="outline" onClick={() => router.push('/login')}>
              ログイン画面へ
            </Button>
          </div>
        ) : isLoading ? (
          <PageLoadingSpinner />
        ) : shouldSearch && searchErrorPresent && (!searchResults || protectedSearchError) ? (
          <div className="space-y-4 rounded-lg border border-destructive/40 p-6 text-center">
            <p className="font-medium">
              {authFailed
                ? 'ログインの有効期限が切れました'
                : forbidden
                  ? 'この検索結果を見る権限がありません'
                  : '検索に失敗しました'}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleSearchErrorAction}
              disabled={searchFetching}
            >
              {authFailed ? 'ログイン画面へ' : forbidden ? '検索条件をクリア' : '再試行'}
            </Button>
          </div>
        ) : shouldSearch && searchResults ? (
          <div className="space-y-6">
            {searchErrorPresent ? (
              <div
                role="alert"
                className="flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <span>取得できませんでした。前回の検索結果です。</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void refetchSearch()}
                  disabled={searchFetching}
                >
                  再試行
                </Button>
              </div>
            ) : null}
            <h2 className="text-xl font-semibold flex items-center gap-2">
              検索結果: {searchResults.totalCount}件
              {searchResults.tasks.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  （タスク: {searchResults.tasks.length}件
                  {searchResults.projects.length > 0 &&
                    `, プロジェクト: ${searchResults.projects.length}件`}
                  ）
                </span>
              )}
            </h2>

            {searchResults.tasks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">タスク ({searchResults.tasks.length})</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {searchResults.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      description={task.description}
                      status={task.status}
                      priority={task.priority}
                      dueDate={task.dueDate}
                      assignee={task.assignee}
                      onEdit={handleTaskEdit}
                      onDelete={handleTaskDelete}
                      onClick={handleTaskClick}
                      canEdit={canEditProject(task.projectId)}
                      canDelete={canDeleteProject(task.projectId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {searchResults.projects.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    プロジェクト ({searchResults.projects.length})
                  </h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {searchResults.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project?projectId=${project.id}`}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Card className="hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                          <h4 className="font-semibold truncate mb-2">{project.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] mb-4">
                            {project.description || '説明なし'}
                          </p>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>タスク: {project._count.tasks}件</span>
                            <span>メンバー: {project.members.length}人</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {searchResults.totalCount === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">検索結果が見つかりませんでした</p>
                <p>検索条件を変更して再度お試しください</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">検索条件を入力して検索してください</p>
            <p>キーワード、プロジェクト、ステータスなどで絞り込めます</p>
          </div>
        )}

        <DeleteConfirmDialog
          open={deleteTaskConfirm.open}
          onOpenChange={(open) => !open && setDeleteTaskConfirm({ open: false, taskId: null })}
          onConfirm={() => {
            if (
              deleteTaskConfirm.taskId &&
              !authExpiredRef.current &&
              !queryWriteBlockedRef.current &&
              canDeleteTaskRef.current(deleteTaskConfirm.taskId) &&
              !deleteSubmission.current &&
              !deleteMutation.isPending
            ) {
              deleteSubmission.current = { taskId: deleteTaskConfirm.taskId };
              deleteMutation.mutate({ id: deleteTaskConfirm.taskId });
            }
          }}
          isPending={deleteMutation.isPending}
          closeOnConfirm={false}
        />
      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <SearchPageContent />
    </Suspense>
  );
}

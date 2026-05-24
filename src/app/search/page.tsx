'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
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
import { isTaskStatus, TASK_STATUS_LABELS } from '@/lib/constant/status';
import { dateOnlyToUtcEndIso, dateOnlyToUtcStartIso } from '@/lib/date';
import { api } from '@/trpc/react';

const TASK_STATUS_VALUES = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'CANCELLED',
  'BLOCKED',
] as const;
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

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const initialStatus = searchParams.get('status') ?? 'all';
  const initialPriority = searchParams.get('priority') ?? 'all';

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      keyword: searchParams.get('keyword') ?? '',
      projectId: searchParams.get('projectId') ?? 'all',
      status: isTaskStatus(initialStatus) ? initialStatus : 'all',
      priority: isTaskPriority(initialPriority) ? initialPriority : 'all',
      assignedTo: searchParams.get('assignedTo') ?? 'all',
      dateFrom: searchParams.get('dateFrom') ?? '',
      dateTo: searchParams.get('dateTo') ?? '',
    },
  });

  const formValues = form.watch();

  const shouldSearch =
    !!formValues.keyword ||
    formValues.projectId !== 'all' ||
    formValues.status !== 'all' ||
    formValues.priority !== 'all' ||
    formValues.assignedTo !== 'all' ||
    !!formValues.dateFrom ||
    !!formValues.dateTo;

  const { data: projects } = api.search.getUserProjects.useQuery();
  const { data: users } = api.search.getProjectMembers.useQuery();
  const { data: searchResults, isLoading } = api.search.search.useQuery(
    {
      keyword: formValues.keyword || undefined,
      projectId: formValues.projectId !== 'all' ? formValues.projectId : undefined,
      status: formValues.status,
      priority: formValues.priority,
      assignedTo: formValues.assignedTo !== 'all' ? formValues.assignedTo : undefined,
      dateFrom: formValues.dateFrom ? dateOnlyToUtcStartIso(formValues.dateFrom) : undefined,
      dateTo: formValues.dateTo ? dateOnlyToUtcEndIso(formValues.dateTo) : undefined,
    },
    {
      enabled: shouldSearch,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    const paramMap: Array<{ key: keyof SearchFormValues; transform?: (v: string) => string }> = [
      { key: 'keyword' },
      { key: 'projectId' },
      {
        key: 'status',
        transform: (v: string) =>
          isTaskStatus(v) ? v : v === 'all' ? 'all' : form.getValues('status'),
      },
      {
        key: 'priority',
        transform: (v: string) =>
          isTaskPriority(v) ? v : v === 'all' ? 'all' : form.getValues('priority'),
      },
      { key: 'assignedTo' },
      { key: 'dateFrom' },
      { key: 'dateTo' },
    ];

    for (const { key, transform } of paramMap) {
      const value = searchParams.get(key);
      if (value) {
        const transformed = transform ? transform(value) : value;
        form.setValue(key, transformed);
      }
    }
  }, [searchParams, form]);

  const handleSearch = () => {
    const values = form.getValues();
    const searchParamList = [
      { key: 'keyword', value: values.keyword },
      { key: 'projectId', value: values.projectId, exclude: 'all' },
      { key: 'status', value: values.status, exclude: 'all' },
      { key: 'priority', value: values.priority, exclude: 'all' },
      { key: 'assignedTo', value: values.assignedTo, exclude: 'all' },
      { key: 'dateFrom', value: values.dateFrom },
      { key: 'dateTo', value: values.dateTo },
    ];

    const params = new URLSearchParams();
    const filteredParams = searchParamList.filter(
      (param) => param.value && param.value !== param.exclude,
    );
    for (const param of filteredParams) {
      params.set(param.key, param.value);
    }

    router.push(`/search?${params.toString()}`);
  };

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
    router.push(`/task?taskId=${taskId}&edit=true`);
  };

  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{
    open: boolean;
    taskId: string | null;
  }>({ open: false, taskId: null });

  const deleteMutation = api.task.delete.useMutation({
    onSuccess: () => {
      utils.search.search.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? 'タスクの削除に失敗しました');
    },
  });

  const handleTaskDelete = (taskId: string) => {
    setDeleteTaskConfirm({ open: true, taskId });
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/project?projectId=${projectId}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">検索</h1>
          <p className="text-muted-foreground">タスクやプロジェクトを検索します</p>
        </div>

        <Card>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project">プロジェクト</Label>
                  <Select
                    value={formValues.projectId}
                    onValueChange={(v) => form.setValue('projectId', v)}
                  >
                    <SelectTrigger id="project">
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
                  >
                    <SelectTrigger id="assignedTo">
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
                <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  検索
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <PageLoadingSpinner />
        ) : shouldSearch && searchResults ? (
          <div className="space-y-6">
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
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleProjectClick(project.id)}
                    >
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
            if (deleteTaskConfirm.taskId) {
              deleteMutation.mutate({ id: deleteTaskConfirm.taskId });
              setDeleteTaskConfirm({ open: false, taskId: null });
            }
          }}
          isPending={deleteMutation.isPending}
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

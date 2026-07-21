'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Textarea } from '@/component/ui/textarea';
import { TASK_PRIORITY, TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/constant/priority';
import { TASK_STATUS, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';
import { api } from '@/trpc/react';

const taskFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: z.nativeEnum(TASK_STATUS),
  priority: z.nativeEnum(TASK_PRIORITY),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  projectId: z.string().min(1, 'プロジェクトは必須です'),
  assigneeId: z.string().optional(),
  expectedUpdatedAt: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: TaskFormData | undefined;
  projects: Array<{ id: string; name: string }>;
}

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  projectId: string;
  assigneeId?: string;
  // 楽観ロック用。編集画面を開いた時点の updatedAt（ISO文字列）を保持し、
  // update API に渡すことで「他の人が先に更新していたら CONFLICT」を検出できる
  expectedUpdatedAt?: string;
}

function buildTaskFormValues(
  initialData: TaskFormData | undefined,
  projects: Array<{ id: string; name: string }>,
): TaskFormValues {
  return {
    id: initialData?.id,
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    status: initialData?.status ?? TASK_STATUS.TODO,
    priority: initialData?.priority ?? TASK_PRIORITY.MEDIUM,
    dueDate: initialData?.dueDate ?? '',
    estimatedHours: initialData?.estimatedHours,
    projectId: initialData?.projectId ?? (projects[0]?.id || ''),
    assigneeId: initialData?.assigneeId ?? '',
    expectedUpdatedAt: initialData?.expectedUpdatedAt,
  };
}

export function TaskDialog({ open, onClose, onSubmit, initialData, projects }: TaskDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: buildTaskFormValues(initialData, projects),
  });
  const selectedProjectId = watch('projectId');
  const { data: projectMembers } = api.search.getMembersByProject.useQuery(
    { projectId: selectedProjectId },
    { enabled: open && !!selectedProjectId },
  );
  const users = projectMembers ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(buildTaskFormValues(initialData, projects));
  }, [initialData, open, projects, reset]);

  const handleClose = () => {
    reset(buildTaskFormValues(undefined, projects));
    onClose();
  };

  const handleFormSubmit = (data: TaskFormValues) => {
    const submitData: TaskFormData = {
      ...(data.id !== undefined && { id: data.id }),
      title: data.title,
      status: data.status,
      priority: data.priority,
      projectId: data.projectId,
      ...(data.description && { description: data.description }),
      ...(data.dueDate && { dueDate: data.dueDate }),
      ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
      ...(data.assigneeId && { assigneeId: data.assigneeId }),
      // 編集時のみ送る。サーバー側は updatedAt が一致しないと CONFLICT を返す
      ...(data.id !== undefined &&
        data.expectedUpdatedAt !== undefined && { expectedUpdatedAt: data.expectedUpdatedAt }),
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'タスク編集' : 'タスク作成'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'タスクの詳細を更新します。'
              : 'プロジェクトに新しいタスクを追加します。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                タイトル{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="title"
                placeholder="タスクのタイトルを入力"
                aria-required="true"
                {...register('title')}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                placeholder="タスクの説明..."
                rows={4}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">
                  ステータス{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" aria-label="ステータスを選択" aria-required="true">
                        <SelectValue placeholder="ステータスを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">
                  優先度{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="priority" aria-label="優先度を選択" aria-required="true">
                        <SelectValue placeholder="優先度を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project">
                  プロジェクト{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value !== field.value) {
                          // 移動先プロジェクトに現担当者が居ない可能性があるため一旦未割当へ
                          setValue('assigneeId', '');
                        }
                        field.onChange(value);
                      }}
                      disabled={!projects.length}
                    >
                      <SelectTrigger
                        id="project"
                        aria-label="プロジェクトを選択"
                        aria-required="true"
                      >
                        <SelectValue placeholder="プロジェクトを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.projectId && (
                  <p className="text-sm text-destructive">{errors.projectId.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">担当者</Label>
                <Controller
                  name="assigneeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || 'unassigned'}
                      onValueChange={(value) => field.onChange(value === 'unassigned' ? '' : value)}
                    >
                      <SelectTrigger id="assignee" aria-label="担当者を選択">
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">未割当</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">期限</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">見積時間</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.0"
                  {...register('estimatedHours', {
                    setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button type="submit">{initialData?.id ? '更新' : '作成'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

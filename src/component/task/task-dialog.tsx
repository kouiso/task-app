'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
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
  // 非同期で送信する場合は Promise を返す。Promise が reject した時は失敗として扱い、
  // ダイアログを閉じずに下書きを残す
  onSubmit: (data: TaskFormData) => unknown;
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
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: buildTaskFormValues(initialData, projects),
  });

  // 送信応答が返る頃には下書きが変わっている可能性があるため、送信時点の
  // 状態を世代（generation）と編集回数（revision）で記録して成功時に照合する。
  // 世代はダイアログの開閉と編集対象の切り替わりで進め、revision は下書きの
  // 変更ごとに進める。世代がずれた成功は別セッションのものとして触れない。
  const generationRef = useRef(0);
  const draftRevisionRef = useRef(0);

  useEffect(() => {
    const subscription = watch(() => {
      draftRevisionRef.current += 1;
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  const selectedProjectId = watch('projectId');
  const projectsRef = useRef(projects);
  const { data: projectMembers } = api.search.getMembersByProject.useQuery(
    { projectId: selectedProjectId },
    { enabled: open && !!selectedProjectId },
  );
  const users = projectMembers ?? [];

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    // 開閉や編集対象の切り替わりは別セッションなので世代を進める
    generationRef.current += 1;
    draftRevisionRef.current = 0;
    if (!open) {
      return;
    }

    reset(buildTaskFormValues(initialData, projectsRef.current));
  }, [initialData, open, reset]);

  useEffect(() => {
    const firstProjectId = projects[0]?.id;
    if (!open || initialData || selectedProjectId || !firstProjectId) {
      return;
    }

    setValue('projectId', firstProjectId, { shouldDirty: false });
  }, [initialData, open, projects, selectedProjectId, setValue]);

  const handleClose = () => {
    reset(buildTaskFormValues(undefined, projects));
    onClose();
  };

  const handleFormSubmit = async (data: TaskFormValues) => {
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
    const submitGeneration = generationRef.current;
    const submitRevision = draftRevisionRef.current;
    try {
      await onSubmit(submitData);
    } catch {
      // 失敗時はダイアログを閉じず下書きを残す。エラー通知は呼び出し側の責務
      return;
    }
    // 成功通知はダイアログを閉じる・閉じないに関係なく必ず出す
    toast.success(submitData.id ? 'タスクを更新しました' : 'タスクを作成しました');
    if (submitGeneration !== generationRef.current) {
      return;
    }
    if (submitRevision !== draftRevisionRef.current) {
      // 送信後に書き足された下書きは保存されていないので、閉じずに理由を伝える
      toast(
        submitData.id
          ? '送信後の変更は保存されていません。閉じて開き直してから保存してください'
          : '送信後の変更は保存されていません。このまま作成すると別のタスクになります',
      );
      return;
    }
    handleClose();
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
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
                {...register('title')}
              />
              {errors.title && (
                <p id="title-error" className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '送信中...' : initialData?.id ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

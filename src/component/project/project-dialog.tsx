'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/component/ui/textarea';
import { DEFAULT_PROJECT_COLOR } from '@/lib/constant/project';

const projectFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().optional(),
  color: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  initialData?: ProjectFormData | undefined;
}

export interface ProjectFormData {
  id?: string;
  name: string;
  description?: string;
  color: string;
  startDate?: string;
  endDate?: string;
}

function buildProjectFormValues(initialData: ProjectFormData | undefined): ProjectFormValues {
  return {
    id: initialData?.id,
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    color: initialData?.color ?? DEFAULT_PROJECT_COLOR,
    startDate: initialData?.startDate ?? '',
    endDate: initialData?.endDate ?? '',
  };
}

export function ProjectDialog({ open, onClose, onSubmit, initialData }: ProjectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: buildProjectFormValues(initialData),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(buildProjectFormValues(initialData));
  }, [initialData, open, reset]);

  const handleClose = () => {
    reset(buildProjectFormValues(undefined));
    onClose();
  };

  const handleFormSubmit = (data: ProjectFormValues) => {
    const submitData: ProjectFormData = {
      ...(data.id !== undefined && { id: data.id }),
      name: data.name,
      color: data.color,
      ...(data.description && { description: data.description }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'プロジェクト編集' : 'プロジェクト作成'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'プロジェクトの詳細を更新します。'
              : '新しいプロジェクトを作成します。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                プロジェクト名{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="name"
                placeholder="プロジェクト名を入力"
                aria-required="true"
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                placeholder="プロジェクトの説明..."
                rows={4}
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 grid gap-2">
                <Label htmlFor="color">カラー</Label>
                <Input id="color" type="color" className="h-10 w-full" {...register('color')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">開始日</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">終了日</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
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

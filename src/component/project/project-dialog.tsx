'use client';

import { useEffect, useState } from 'react';
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

export function ProjectDialog({ open, onClose, onSubmit, initialData }: ProjectDialogProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    color: DEFAULT_PROJECT_COLOR,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        name: '',
        description: '',
        color: DEFAULT_PROJECT_COLOR,
      });
    }
  }, [initialData]);

  const handleChange =
    (field: keyof ProjectFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'プロジェクト編集' : 'プロジェクト作成'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'プロジェクトの詳細を更新します。'
              : '新しいプロジェクトを作成します。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">プロジェクト名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="プロジェクト名を入力"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={handleChange('description')}
                placeholder="プロジェクトの説明..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">カラー</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={handleChange('color')}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">開始日</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate || ''}
                  onChange={handleChange('startDate')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">終了日</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate || ''}
                  onChange={handleChange('endDate')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!formData.name}>
              {initialData?.id ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

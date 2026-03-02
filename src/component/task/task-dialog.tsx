'use client';

import type { TaskPriority, TaskStatus } from '@prisma/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Textarea } from '@/component/ui/textarea';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: TaskFormData | undefined;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string | null; email: string }>;
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
}

export function TaskDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  projects,
  users,
}: TaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    projectId: '',
    assigneeId: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: projects[0]?.id || '',
        assigneeId: '',
      });
    }
  }, [initialData, projects]);

  const handleChange =
    (field: keyof TaskFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const handleNumberChange =
    (field: 'estimatedHours') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        const { [field]: _, ...rest } = formData;
        setFormData(rest as TaskFormData);
      } else {
        setFormData({
          ...formData,
          [field]: Number(value),
        });
      }
    };

  const handleSelectChange = (field: keyof TaskFormData) => (value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'タスク編集' : 'タスク作成'}</DialogTitle>
          <DialogDescription>
            {initialData?.id
              ? 'タスクの詳細を更新します。'
              : 'プロジェクトに新しいタスクを追加します。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="タスクのタイトルを入力"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={handleChange('description')}
                placeholder="タスクの説明..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">ステータス</Label>
                <Select value={formData.status} onValueChange={handleSelectChange('status')}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">未対応</SelectItem>
                    <SelectItem value="IN_PROGRESS">進行中</SelectItem>
                    <SelectItem value="IN_REVIEW">レビュー中</SelectItem>
                    <SelectItem value="DONE">完了</SelectItem>
                    <SelectItem value="CANCELLED">キャンセル</SelectItem>
                    <SelectItem value="BLOCKED">ブロック</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">優先度</Label>
                <Select value={formData.priority} onValueChange={handleSelectChange('priority')}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="優先度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">低</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="HIGH">高</SelectItem>
                    <SelectItem value="URGENT">緊急</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project">プロジェクト</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={handleSelectChange('projectId')}
                  disabled={!projects.length}
                >
                  <SelectTrigger id="project">
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">担当者</Label>
                <Select
                  value={formData.assigneeId || 'unassigned'}
                  onValueChange={(value) =>
                    handleSelectChange('assigneeId')(value === 'unassigned' ? '' : value)
                  }
                >
                  <SelectTrigger id="assignee">
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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">期限</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={handleChange('dueDate')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">見積時間</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours ?? ''}
                  onChange={handleNumberChange('estimatedHours')}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={!formData.title || !formData.projectId}>
              {initialData?.id ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

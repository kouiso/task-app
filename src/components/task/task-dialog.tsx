'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { useEffect, useState } from 'react';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: TaskFormData | undefined;
  projects: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  currentUserId: string;
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
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Task' : 'Create Task'}</DialogTitle>
          <DialogDescription>
            {initialData?.id ? 'Update task details.' : 'Add a new task to your project.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="Enter task title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={handleChange('description')}
                placeholder="Describe the task..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={handleSelectChange('status')}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={handleSelectChange('priority')}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={handleSelectChange('projectId')}
                  disabled={!projects.length}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
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
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={formData.assigneeId || 'unassigned'}
                  onValueChange={(value) =>
                    handleSelectChange('assigneeId')(value === 'unassigned' ? '' : value)
                  }
                >
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={handleChange('dueDate')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title || !formData.projectId}>
              {initialData?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

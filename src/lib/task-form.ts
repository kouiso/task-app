import type { TaskFormData } from '@/component/task/task-dialog';
import type { TaskPriority } from '@/lib/constant/priority';
import type { TaskStatus } from '@/lib/constant/status';

interface TaskForFormConversion {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  assigneeId: string | null;
}

export const taskToFormData = (task: TaskForFormConversion): TaskFormData => {
  const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined;

  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    ...(dueDate && { dueDate }),
    ...(task.estimatedHours && { estimatedHours: task.estimatedHours }),
    ...(task.assigneeId && { assigneeId: task.assigneeId }),
  };
};

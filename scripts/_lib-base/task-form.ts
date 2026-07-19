import type { TaskFormData } from '@/component/task/task-dialog';
import type { TaskPriority } from '@/lib/constant/priority';
import type { TaskStatus } from '@/lib/constant/status';
import { dateOnlyFromValue } from './date';

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
  updatedAt: Date;
}

export const taskToFormData = (task: TaskForFormConversion): TaskFormData => {
  const dueDate = task.dueDate ? dateOnlyFromValue(task.dueDate) : undefined;

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
    // 楽観ロック用。読み込み時点の updatedAt を保持して update API に渡す
    expectedUpdatedAt: task.updatedAt.toISOString(),
  };
};

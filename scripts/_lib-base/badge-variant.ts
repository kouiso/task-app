import { TASK_PRIORITY, type TaskPriority } from '@/lib/constant/priority';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const getPriorityBadgeVariant = (priority: TaskPriority): BadgeVariant => {
  switch (priority) {
    case TASK_PRIORITY.URGENT:
      return 'destructive';
    case TASK_PRIORITY.HIGH:
      return 'default';
    case TASK_PRIORITY.MEDIUM:
      return 'secondary';
    default:
      return 'outline';
  }
};

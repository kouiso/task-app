import { TASK_PRIORITY, type TaskPriority } from '@/lib/constant/priority';
import { TASK_STATUS, type TaskStatus } from '@/lib/constant/status';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const getStatusBadgeVariant = (status: TaskStatus): BadgeVariant => {
  switch (status) {
    case TASK_STATUS.DONE:
      return 'secondary';
    case TASK_STATUS.IN_PROGRESS:
      return 'default';
    case TASK_STATUS.IN_REVIEW:
      return 'outline';
    case TASK_STATUS.CANCELLED:
      return 'destructive';
    default:
      return 'outline';
  }
};

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

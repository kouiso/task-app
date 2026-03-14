import type { TaskPriority } from '@/lib/constant/priority';
import type { TaskStatus } from '@/lib/constant/status';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export const getStatusBadgeVariant = (status: TaskStatus): BadgeVariant => {
  switch (status) {
    case 'DONE':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'IN_REVIEW':
      return 'outline';
    case 'CANCELLED':
    case 'BLOCKED':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const getPriorityBadgeVariant = (priority: TaskPriority): BadgeVariant => {
  switch (priority) {
    case 'URGENT':
      return 'destructive';
    case 'HIGH':
      return 'default';
    case 'MEDIUM':
      return 'secondary';
    default:
      return 'outline';
  }
};

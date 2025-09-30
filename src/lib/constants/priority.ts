import { TaskPriority } from '@prisma/client';

export const TASK_PRIORITY_LABELS = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '緊急',
} as const;

export const TASK_PRIORITY_COLORS = {
  LOW: 'default',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'error',
} as const;

export const TASK_PRIORITY_VALUES = [
  { value: TaskPriority.LOW, label: TASK_PRIORITY_LABELS.LOW },
  { value: TaskPriority.MEDIUM, label: TASK_PRIORITY_LABELS.MEDIUM },
  { value: TaskPriority.HIGH, label: TASK_PRIORITY_LABELS.HIGH },
  { value: TaskPriority.URGENT, label: TASK_PRIORITY_LABELS.URGENT },
] as const;

export const getPriorityLabel = (priority: TaskPriority): string => {
  return TASK_PRIORITY_LABELS[priority];
};

export const getPriorityColor = (priority: TaskPriority) => {
  return TASK_PRIORITY_COLORS[priority];
};

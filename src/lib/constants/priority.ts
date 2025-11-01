export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#9e9e9e',
  MEDIUM: '#2196f3',
  HIGH: '#ff9800',
  URGENT: '#f44336',
};

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && value in TASK_PRIORITY;
}

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
  BLOCKED: 'BLOCKED',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
  BLOCKED: 'Blocked',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#9e9e9e',
  IN_PROGRESS: '#2196f3',
  IN_REVIEW: '#ff9800',
  DONE: '#4caf50',
  CANCELLED: '#f44336',
  BLOCKED: '#9c27b0',
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && value in TASK_STATUS;
}

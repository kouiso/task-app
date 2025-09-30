import { TaskStatus } from '@prisma/client';

export const TASK_STATUS_LABELS = {
  TODO: '未対応',
  IN_PROGRESS: '進行中',
  IN_REVIEW: 'レビュー中',
  DONE: '完了',
  BLOCKED: 'ブロック',
} as const;

export const TASK_STATUS_COLORS = {
  TODO: 'default',
  IN_PROGRESS: 'primary',
  IN_REVIEW: 'warning',
  DONE: 'success',
  BLOCKED: 'error',
} as const;

export const TASK_STATUS_VALUES = [
  { value: TaskStatus.TODO, label: TASK_STATUS_LABELS.TODO },
  { value: TaskStatus.IN_PROGRESS, label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: TaskStatus.IN_REVIEW, label: TASK_STATUS_LABELS.IN_REVIEW },
  { value: TaskStatus.DONE, label: TASK_STATUS_LABELS.DONE },
  { value: TaskStatus.BLOCKED, label: TASK_STATUS_LABELS.BLOCKED },
] as const;

export const getStatusLabel = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status];
};

export const getStatusColor = (status: TaskStatus) => {
  return TASK_STATUS_COLORS[status];
};

// ステータス変更のワークフロー定義
export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.DONE, TaskStatus.BLOCKED, TaskStatus.TODO],
  [TaskStatus.IN_REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
  [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS], // 再開可能
  [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
} as const;

export const canTransitionTo = (from: TaskStatus, to: TaskStatus): boolean => {
  return STATUS_TRANSITIONS[from].includes(to);
};

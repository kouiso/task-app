export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: '未対応',
  IN_PROGRESS: '進行中',
  IN_REVIEW: 'レビュー中',
  DONE: '完了',
  CANCELLED: 'キャンセル',
};

// ダッシュボードヒーロー/統計カードと統一した Tailwind -400/-500 系パレット
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#64748b',
  IN_PROGRESS: '#60a5fa',
  IN_REVIEW: '#fbbf24',
  DONE: '#34d399',
  CANCELLED: '#f87171',
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && value in TASK_STATUS;
}

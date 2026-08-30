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

// globals.css のセマンティックトークンから引いた値。Recharts が hex しか受け取らないので
// ここで一度だけ実体化する。トークンを変えたときはこの表も合わせること
// muted-foreground / accent(chart-2) / warning / success / destructive の順に対応する
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#5f6777',
  IN_PROGRESS: '#1e9cb8',
  IN_REVIEW: '#f69e23',
  DONE: '#26ab7a',
  CANCELLED: '#dc3848',
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && value in TASK_STATUS;
}

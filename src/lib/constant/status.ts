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

// Recharts が hex を受け取るため、グラフ専用に固定値へ展開している。
// グラフ以外の小さい文字には、テーマに合わせて切り替わる下のマッピングを使う。
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#5f6777',
  IN_PROGRESS: '#1e9cb8',
  IN_REVIEW: '#f69e23',
  DONE: '#26ab7a',
  CANCELLED: '#dc3848',
};

// 小さいラベルでも背景とのコントラストを確保する本文用の色。
// CSS変数は light / dark テーマで別の値になるため、固定HEXを文字へ直接当てない。
export const TASK_STATUS_TEXT_COLORS: Record<TaskStatus, string> = {
  TODO: 'hsl(var(--muted-foreground))',
  IN_PROGRESS: 'hsl(var(--accent-foreground))',
  IN_REVIEW: 'hsl(var(--warning-text))',
  DONE: 'hsl(var(--success-text))',
  CANCELLED: 'hsl(var(--destructive))',
};

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && value in TASK_STATUS;
}

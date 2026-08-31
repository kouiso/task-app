export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '緊急',
};

// Recharts が hex を受け取るため、グラフ専用に固定値へ展開している。
// グラフ以外の小さい文字には、テーマに合わせて切り替わる下のマッピングを使う。
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#5f6777',
  MEDIUM: '#1e9cb8',
  HIGH: '#f69e23',
  URGENT: '#dc3848',
};

// 小さいラベルでも背景とのコントラストを確保する本文用の色。
// CSS変数は light / dark テーマで別の値になるため、固定HEXを文字へ直接当てない。
export const TASK_PRIORITY_TEXT_COLORS: Record<TaskPriority, string> = {
  LOW: 'hsl(var(--muted-foreground))',
  MEDIUM: 'hsl(var(--accent-foreground))',
  HIGH: 'hsl(var(--warning-text))',
  URGENT: 'hsl(var(--destructive))',
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

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

// globals.css の chart トークンから引いた値。緊急へ向かって温度が上がる並びにしてある
// グラフ以外で優先度に色を割り当てないのは、1枚のカードに色が積み上がるのを避けるため
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#5f6777',
  MEDIUM: '#1e9cb8',
  HIGH: '#f69e23',
  URGENT: '#dc3848',
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

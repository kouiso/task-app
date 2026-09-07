import { TASK_PRIORITY, type TaskPriority } from '@/lib/constant/priority';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// 緊急だけを色で立たせる。高・中・低へ色を配ると、1枚のカードに状態・優先度・期限で
// 色が3つ積み上がって、どれを先に見ればよいか分からなくなる。文字が優先度を伝えるので
// ブランド色（primary）はボタンやリンクのために取っておく
export const getPriorityBadgeVariant = (priority: TaskPriority): BadgeVariant => {
  switch (priority) {
    case TASK_PRIORITY.URGENT:
      return 'destructive';
    case TASK_PRIORITY.HIGH:
      return 'secondary';
    default:
      return 'outline';
  }
};

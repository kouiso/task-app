import { Badge } from '@/component/ui/badge';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = TASK_STATUS_COLORS[status];
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        backgroundColor: `${color}1f`,
        color,
        borderColor: `${color}66`,
      }}
    >
      {TASK_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

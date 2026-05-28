import { Badge } from '@/component/ui/badge';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const FALLBACK_COLOR = '#64748b';
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** 7文字HEX (#RRGGBB) のみ末尾にアルファ値を結合する。それ以外は元の色をそのまま返す */
function withAlpha(color: string, alphaHex: string): string {
  return HEX_COLOR_PATTERN.test(color) ? `${color}${alphaHex}` : color;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = TASK_STATUS_COLORS[status] ?? FALLBACK_COLOR;
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        backgroundColor: withAlpha(color, '1f'),
        color,
        borderColor: withAlpha(color, '66'),
      }}
    >
      {TASK_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

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

// 淡色背景に原色前景ではWCAGコントラスト不足のため前景のみ暗色化
function darkenForForeground(color: string): string {
  if (!HEX_COLOR_PATTERN.test(color)) {
    return color;
  }
  const channels = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)];
  const darkened = channels
    .map((channel) => {
      const value = Number.parseInt(channel, 16);
      const scaled = Math.round(value * 0.55);
      return Math.min(255, Math.max(0, scaled)).toString(16).padStart(2, '0');
    })
    .join('');
  return `#${darkened}`;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = TASK_STATUS_COLORS[status] ?? FALLBACK_COLOR;
  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        backgroundColor: withAlpha(color, '1f'),
        color: darkenForForeground(color),
        borderColor: withAlpha(color, '66'),
      }}
    >
      {TASK_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

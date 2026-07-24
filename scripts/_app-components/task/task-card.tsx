'use client';

import { AlertTriangle, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/constant/priority';
import { TASK_STATUS, type TaskStatus } from '@/lib/constant/status';
import { formatDateOnly, isOverdue } from '@/lib/date';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  assignee?: {
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  // 権限はサーバー側 (assertMemberPermission) が最終判定する。この props は
  // 「権限が無いと分かっているボタンを出さない」ための表示制御で、
  // 権限を扱わない序盤の教材 (Day13〜16) がそのまま動くように未指定時は表示する。
  canEdit?: boolean;
  canDelete?: boolean;
}

export function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  assignee,
  onEdit,
  onDelete,
  onClick,
  canEdit = true,
  canDelete = true,
}: TaskCardProps) {
  const overdue =
    isOverdue(dueDate) && status !== TASK_STATUS.DONE && status !== TASK_STATUS.CANCELLED;

  const handleCardClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <Card
      className={cn(
        'transition-all h-full flex flex-col',
        onClick && 'cursor-pointer hover:shadow-md',
        overdue && 'border-destructive/60 bg-destructive/5',
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <CardTitle
          className="text-base font-semibold leading-none truncate max-w-[calc(100%-80px)]"
          title={title}
        >
          {onClick ? (
            <button
              type="button"
              className="w-full text-left truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </CardTitle>
        <div className="flex gap-0">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              aria-label="タスクを編集"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="タスクを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}

        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={status} />
          <Badge variant={getPriorityBadgeVariant(priority)}>
            {TASK_PRIORITY_LABELS[priority]}
          </Badge>
          {overdue && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              期限切れ
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-3 border-t">
          <div className="flex justify-between items-center">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {assignee.avatar && <AvatarImage src={assignee.avatar} />}
                  <AvatarFallback className="text-[10px]">
                    {(assignee.name || assignee.email || '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {assignee.name || assignee.email}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">未割当</span>
            )}

            {dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  overdue ? 'text-destructive font-semibold' : 'text-muted-foreground',
                )}
              >
                <CalendarDays className="h-3 w-3" />
                <span>
                  {overdue && <span className="sr-only">期限切れ </span>}
                  {formatDateOnly(dueDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

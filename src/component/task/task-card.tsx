'use client';

import { CalendarDays, Clock, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { getPriorityBadgeVariant, getStatusBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/constant/priority';
import { TASK_STATUS_LABELS, type TaskStatus } from '@/lib/constant/status';
import { formatDateOnly } from '@/lib/date';
import { cn } from '@/lib/utils';
import { TaskTimer } from './task-timer';
import { TimeLogDialog } from './time-log-dialog';

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
  isTimerActive?: boolean;
  timerStartedAt?: Date | null;
  timeSpentMinutes?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  onTimerUpdate?: (() => void) | undefined;
}

export function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  assignee,
  isTimerActive = false,
  timerStartedAt = null,
  timeSpentMinutes = 0,
  onEdit,
  onDelete,
  onClick,
  onTimerUpdate,
}: TaskCardProps) {
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);

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

  const handleOpenTimeLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeLogDialogOpen(true);
  };

  return (
    <>
      <Card
        className={cn(
          'transition-all h-full flex flex-col',
          onClick && 'cursor-pointer hover:shadow-md',
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleEdit}
              aria-label="タスクを編集"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="タスクを削除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Badge variant={getStatusBadgeVariant(status)}>{TASK_STATUS_LABELS[status]}</Badge>
            <Badge variant={getPriorityBadgeVariant(priority)}>
              {TASK_PRIORITY_LABELS[priority]}
            </Badge>
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  <span>{formatDateOnly(dueDate)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <TaskTimer
                taskId={id}
                isTimerActive={isTimerActive}
                timerStartedAt={timerStartedAt}
                timeSpentMinutes={timeSpentMinutes}
                onTimerUpdate={onTimerUpdate}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={handleOpenTimeLog}
                aria-label={`${title}の時間を記録`}
              >
                <Clock className="mr-2 h-3 w-3" />
                時間記録
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <TimeLogDialog
        open={timeLogDialogOpen}
        onClose={() => setTimeLogDialogOpen(false)}
        taskId={id}
        onSuccess={onTimerUpdate}
      />
    </>
  );
}

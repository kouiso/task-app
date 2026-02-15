'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { cn } from '@/lib/utils';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { CalendarDays, Clock, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
  onTimerUpdate?: () => void;
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

  const getStatusBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'DONE':
        return 'secondary'; // Using secondary for DONE/Success
      case 'IN_PROGRESS':
        return 'default'; // Primary for In Progress
      case 'IN_REVIEW':
        return 'outline'; // Warning equivalent
      case 'CANCELLED':
      case 'BLOCKED':
        return 'destructive'; // Error equivalent
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default'; // Warning equivalent often mapped to default or specific class
      case 'MEDIUM':
        return 'secondary'; // Primary equivalent
      default:
        return 'outline';
    }
  };

  return (
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
          {title}
        </CardTitle>
        <div className="flex gap-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleEdit}
            aria-label="Edit task"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}

        <div className="flex gap-2 flex-wrap">
          <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
            {status.replace('_', ' ')}
          </Badge>
          <Badge variant={getPriorityBadgeVariant(priority)} className="capitalize">
            {priority}
          </Badge>
        </div>

        <div className="mt-auto pt-4 flex flex-col gap-3 border-t">
          <div className="flex justify-between items-center">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignee.avatar || ''} />
                  <AvatarFallback className="text-[10px]">
                    {(assignee.name || assignee.email || '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {assignee.name || assignee.email}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}

            {dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                <span>{new Date(dueDate).toLocaleDateString()}</span>
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
            >
              <Clock className="mr-2 h-3 w-3" />
              Log Time
            </Button>
          </div>
        </div>
      </CardContent>

      <TimeLogDialog
        open={timeLogDialogOpen}
        onClose={() => setTimeLogDialogOpen(false)}
        taskId={id}
        onSuccess={onTimerUpdate}
      />
    </Card>
  );
}

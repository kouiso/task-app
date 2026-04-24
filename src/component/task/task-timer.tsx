'use client';

import { Loader2, PauseIcon, PlayIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/component/ui/button';
import { formatMinutes } from '@/lib/utils/time';
import { api } from '@/trpc/react';

interface TaskTimerProps {
  taskId: string;
  isTimerActive: boolean;
  timerStartedAt: Date | null;
  timeSpentMinutes: number;
  onTimerUpdate?: (() => void) | undefined;
}

export function TaskTimer({
  taskId,
  isTimerActive,
  timerStartedAt,
  timeSpentMinutes,
  onTimerUpdate,
}: TaskTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const updateTimerMutation = api.task.updateTimer.useMutation({
    onSuccess: () => {
      onTimerUpdate?.();
    },
  });

  useEffect(() => {
    if (!isTimerActive || !timerStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(timerStartedAt).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, timerStartedAt]);

  const handleStartStop = async () => {
    try {
      if (isTimerActive) {
        await updateTimerMutation.mutateAsync({
          id: taskId,
          action: 'stop',
        });
      } else {
        await updateTimerMutation.mutateAsync({
          id: taskId,
          action: 'start',
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'タイマーの更新に失敗しました');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant={isTimerActive ? 'destructive' : 'default'}
          size="sm"
          onClick={handleStartStop}
          disabled={updateTimerMutation.isPending}
          aria-label={isTimerActive ? 'タイマー停止' : 'タイマー開始'}
          data-testid={isTimerActive ? 'stop-timer-button' : 'start-timer-button'}
        >
          {updateTimerMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : isTimerActive ? (
            <PauseIcon className="w-4 h-4 mr-2" />
          ) : (
            <PlayIcon className="w-4 h-4 mr-2" />
          )}
          {isTimerActive ? 'タイマー停止' : 'タイマー開始'}
        </Button>

        {isTimerActive && (
          <span className="text-lg font-bold font-mono text-primary">
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        合計作業時間: {formatMinutes(timeSpentMinutes)}
      </p>
    </div>
  );
}

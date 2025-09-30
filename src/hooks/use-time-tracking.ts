import { useCallback } from 'react';
import { api } from '@/lib/trpc/client';
import type { FormattedTime } from '@/type/task';

interface UseTimeTrackingReturn {
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
  addManualTime: (taskId: string, minutes: number) => Promise<void>;
  formatTime: (minutes: number) => FormattedTime;
  isLoading: boolean;
  error: string | null;
}

export const useTimeTracking = (): UseTimeTrackingReturn => {
  const utils = api.useUtils();

  const startTimerMutation = api.task.startTimer.useMutation({
    onSuccess: () => {
      // タスク一覧を無効化してキャッシュを更新
      utils.task.getAll.invalidate();
    },
    onError: (error) => {
      console.error('Timer start error:', error);
    },
  });

  const stopTimerMutation = api.task.stopTimer.useMutation({
    onSuccess: (result) => {
      console.log(`Timer stopped. Added ${result.addedMinutes} minutes`);
      utils.task.getAll.invalidate();
    },
    onError: (error) => {
      console.error('Timer stop error:', error);
    },
  });

  const addManualTimeMutation = api.task.addManualTime.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
    },
    onError: (error) => {
      console.error('Add manual time error:', error);
    },
  });

  const startTimer = useCallback(async (taskId: string) => {
    await startTimerMutation.mutateAsync({ id: taskId });
  }, [startTimerMutation]);

  const stopTimer = useCallback(async (taskId: string) => {
    await stopTimerMutation.mutateAsync({ id: taskId });
  }, [stopTimerMutation]);

  const addManualTime = useCallback(async (taskId: string, minutes: number) => {
    await addManualTimeMutation.mutateAsync({ id: taskId, minutes });
  }, [addManualTimeMutation]);

  const formatTime = useCallback((minutes: number): FormattedTime => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const display = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    return {
      hours,
      minutes: mins,
      formatted: display,
      display
    };
  }, []);

  return {
    startTimer,
    stopTimer,
    addManualTime,
    formatTime,
    isLoading: startTimerMutation.isPending || stopTimerMutation.isPending || addManualTimeMutation.isPending,
    error: startTimerMutation.error?.message || stopTimerMutation.error?.message || addManualTimeMutation.error?.message || null,
  };
};

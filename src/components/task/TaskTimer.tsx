'use client';

import { PlayArrow, Stop } from '@mui/icons-material';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api } from '~/trpc/react';

interface TaskTimerProps {
  taskId: string;
  isTimerActive: boolean;
  timerStartedAt: Date | null;
  timeSpentMinutes: number;
  onTimerUpdate?: () => void;
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
    } catch (error) {
      console.error('Timer update failed:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant={isTimerActive ? 'contained' : 'outlined'}
          color={isTimerActive ? 'error' : 'primary'}
          startIcon={
            updateTimerMutation.isPending ? (
              <CircularProgress size={20} />
            ) : isTimerActive ? (
              <Stop />
            ) : (
              <PlayArrow />
            )
          }
          onClick={handleStartStop}
          disabled={updateTimerMutation.isPending}
        >
          {isTimerActive ? 'Stop Timer' : 'Start Timer'}
        </Button>

        {isTimerActive && (
          <Typography variant="h6" color="primary" sx={{ fontFamily: 'monospace' }}>
            {formatTime(elapsedSeconds)}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary">
        Total time spent: {formatMinutes(timeSpentMinutes)}
      </Typography>
    </Box>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Add,
  AccessTime
} from '@mui/icons-material';
import { useTimeTracking } from '@/hooks/use-time-tracking';
import type { TaskWithRelations } from '@/type/task';

interface TaskTimerProps {
  task: TaskWithRelations;
  onUpdate?: () => void;
}

export default function TaskTimer({ task, onUpdate }: TaskTimerProps) {
  const { startTimer, stopTimer, addManualTime, formatTime, isLoading, error } = useTimeTracking();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  useEffect(() => {
    if (!task.isTimerActive || !task.timerStartedAt) {
      setElapsedTime(0);
      return;
    }

    const calculateElapsed = () => {
      const startTime = new Date(task.timerStartedAt!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / (1000 * 60));
      setElapsedTime(elapsed);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [task.isTimerActive, task.timerStartedAt]);

  const displayMinutes = (task.timeSpentMinutes || 0) + elapsedTime;
  const timeDisplay = formatTime(displayMinutes);

  const handleStartStop = async () => {
    if (task.isTimerActive) {
      await stopTimer(task.id);
    } else {
      await startTimer(task.id);
    }
    onUpdate?.();
  };

  const handleAddManualTime = async () => {
    const minutes = parseInt(manualMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      return;
    }

    await addManualTime(task.id, minutes);
    setOpenDialog(false);
    setManualMinutes('');
    onUpdate?.();
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Chip
          icon={<AccessTime />}
          label={timeDisplay.display}
          color={task.isTimerActive ? 'primary' : 'default'}
          variant={task.isTimerActive ? 'filled' : 'outlined'}
          sx={{
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            py: 1,
            animation: task.isTimerActive ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.8 }
            }
          }}
        />

        {task.isTimerActive && (
          <Typography variant="caption" color="primary">
            タイマー実行中
          </Typography>
        )}
      </Box>

      <Box display="flex" gap={1}>
        <Button
          variant={task.isTimerActive ? 'contained' : 'outlined'}
          color={task.isTimerActive ? 'error' : 'primary'}
          startIcon={
            isLoading ?
              <CircularProgress size={16} /> :
              (task.isTimerActive ? <Stop /> : <PlayArrow />)
          }
          onClick={handleStartStop}
          disabled={isLoading}
        >
          {task.isTimerActive ? '停止' : '開始'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          disabled={isLoading}
        >
          時間追加
        </Button>
      </Box>

      {error && (
        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>作業時間を追加</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="追加する時間（分）"
            type="number"
            fullWidth
            variant="outlined"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
            inputProps={{ min: 1, max: 1440 }}
            helperText="1分から24時間（1440分）まで入力できます"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleAddManualTime}
            variant="contained"
            disabled={!manualMinutes || parseInt(manualMinutes) <= 0}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

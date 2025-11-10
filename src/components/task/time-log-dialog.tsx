'use client';

import { api } from '@/trpc/react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState } from 'react';

interface TimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: () => void;
}

export function TimeLogDialog({ open, onClose, taskId, onSuccess }: TimeLogDialogProps) {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');

  const addTimeMutation = api.task.addTime.useMutation({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    setHours('');
    setMinutes('');
    onClose();
  };

  const handleSubmit = async () => {
    const totalMinutes =
      Number.parseInt(hours || '0', 10) * 60 + Number.parseInt(minutes || '0', 10);

    if (totalMinutes <= 0) {
      return;
    }

    try {
      await addTimeMutation.mutateAsync({
        id: taskId,
        minutesToAdd: totalMinutes,
      });
    } catch (error) {
      console.error('Failed to add time:', error);
    }
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setHours(value);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && Number.parseInt(value, 10) < 60)) {
      setMinutes(value);
    }
  };

  const isValid = Number.parseInt(hours || '0', 10) * 60 + Number.parseInt(minutes || '0', 10) > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Time Log</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            label="Hours"
            value={hours}
            onChange={handleHoursChange}
            type="text"
            inputMode="numeric"
            fullWidth
            placeholder="0"
            helperText="Enter hours worked"
          />
          <TextField
            label="Minutes"
            value={minutes}
            onChange={handleMinutesChange}
            type="text"
            inputMode="numeric"
            fullWidth
            placeholder="0"
            helperText="Enter minutes (0-59)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={addTimeMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || addTimeMutation.isPending}
        >
          {addTimeMutation.isPending ? 'Adding...' : 'Add Time'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

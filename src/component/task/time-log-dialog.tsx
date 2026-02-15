'use client';

import { useState } from 'react';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { api } from '@/trpc/react';

interface TimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: (() => void) | undefined;
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle>Add Time Log</DialogTitle>
        <DialogDescription>タスクに作業時間を記録します</DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="hours" className="text-sm font-medium mb-2 block">
              Hours
            </Label>
            <Input
              id="hours"
              value={hours}
              onChange={handleHoursChange}
              type="text"
              inputMode="numeric"
              placeholder="0"
              disabled={addTimeMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">作業時間（時）</p>
          </div>
          <div className="flex-1">
            <Label htmlFor="minutes" className="text-sm font-medium mb-2 block">
              Minutes
            </Label>
            <Input
              id="minutes"
              value={minutes}
              onChange={handleMinutesChange}
              type="text"
              inputMode="numeric"
              placeholder="0"
              disabled={addTimeMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">作業時間（分、0-59）</p>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={handleClose} disabled={addTimeMutation.isPending}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || addTimeMutation.isPending}>
          {addTimeMutation.isPending ? '追加中...' : '時間を追加'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

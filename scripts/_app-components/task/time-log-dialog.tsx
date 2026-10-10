'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
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
import { httpStatusOf, isAuthError } from '@/lib/query-error';
import { classifyTaskWriteError } from '@/lib/task-write-error';
import { api } from '@/trpc/react';

interface TimeLogDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  onSuccess?: (() => void) | undefined;
}

interface TimeSubmission {
  taskId: string;
  totalMinutes: number;
  hours: string;
  minutes: string;
  generation: number;
  revision: number;
}

type DurationResult =
  | { totalMinutes: number; message: null }
  | { totalMinutes: null; message: string };
type RefreshResult = 'ok' | 'auth' | 'failed';

const parseDuration = (hours: string, minutes: string): DurationResult => {
  if (hours !== '' && !/^\d+$/.test(hours)) {
    return { totalMinutes: null, message: '時間は0以上の整数で入力してください。' };
  }
  if (minutes !== '' && !/^\d+$/.test(minutes)) {
    return { totalMinutes: null, message: '分は0から59の整数で入力してください。' };
  }

  const parsedHours = hours === '' ? 0 : Number(hours);
  const parsedMinutes = minutes === '' ? 0 : Number(minutes);
  if (!Number.isSafeInteger(parsedHours) || !Number.isSafeInteger(parsedMinutes)) {
    return {
      totalMinutes: null,
      message: '入力した作業時間が大きすぎます。桁数を確認してください。',
    };
  }
  if (parsedMinutes > 59) {
    return { totalMinutes: null, message: '分は0から59の整数で入力してください。' };
  }

  const totalMinutes = parsedHours * 60 + parsedMinutes;
  if (!Number.isSafeInteger(totalMinutes)) {
    return {
      totalMinutes: null,
      message: '入力した作業時間が大きすぎます。桁数を確認してください。',
    };
  }
  if (totalMinutes <= 0) {
    return { totalMinutes: null, message: '1分以上入力してください。' };
  }
  return { totalMinutes, message: null };
};

export function TimeLogDialog({ open, onClose, taskId, onSuccess }: TimeLogDialogProps) {
  const utils = api.useUtils();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [errorMessage, setErrorMessage] = useState<{
    text: string;
    tone: 'error' | 'neutral';
  } | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [writePending, setWritePending] = useState(false);
  const mountedRef = useRef(true);
  const hoursRef = useRef('');
  const minutesRef = useRef('');
  const openRef = useRef(open);
  const taskIdRef = useRef(taskId);
  const generationRef = useRef(0);
  const revisionRef = useRef(0);
  const writeLockedRef = useRef(false);
  const authExpiredRef = useRef(false);
  const submissionRef = useRef<TimeSubmission | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (openRef.current === open && taskIdRef.current === taskId) return;
    generationRef.current += 1;
    openRef.current = open;
    taskIdRef.current = taskId;
    if (!open) {
      revisionRef.current += 1;
      hoursRef.current = '';
      minutesRef.current = '';
      setHours('');
      setMinutes('');
      setErrorMessage(null);
    }
  }, [open, taskId]);

  const addTimeMutation = api.task.addTime.useMutation({ retry: false });

  const isCurrentSubmission = (submission: TimeSubmission) =>
    mountedRef.current &&
    openRef.current &&
    taskIdRef.current === submission.taskId &&
    generationRef.current === submission.generation &&
    revisionRef.current === submission.revision;

  const showSubmissionMessage = (
    submission: TimeSubmission,
    message: string,
    tone: 'error' | 'neutral' = 'error',
  ) => {
    if (isCurrentSubmission(submission)) {
      setErrorMessage({ text: message, tone });
    } else if (tone === 'neutral') {
      toast(`先ほど送信した作業時間について、${message}`);
    } else {
      toast.error(`先ほど送信した作業時間について、${message}`);
    }
  };

  const expireAuth = (submission: TimeSubmission, writeCompleted: boolean) => {
    authExpiredRef.current = true;
    setAuthExpired(true);
    const message = writeCompleted
      ? '作業時間は追加されましたが、ログインの有効期限が切れました。もう一度ログインしてください。'
      : 'ログインの有効期限が切れました。もう一度ログインしてください。';
    showSubmissionMessage(submission, message);
  };

  const refreshSubmittedTask = async (
    submission: TimeSubmission,
    writeCompleted: boolean,
  ): Promise<RefreshResult> => {
    try {
      await Promise.all([
        utils.task.getById.invalidate({ id: submission.taskId }, undefined, { throwOnError: true }),
        utils.task.getAll.invalidate(undefined, undefined, { throwOnError: true }),
      ]);
      return 'ok';
    } catch (error) {
      if (!mountedRef.current) return 'failed';
      if (isAuthError(error)) {
        expireAuth(submission, writeCompleted);
        return 'auth';
      }
      return 'failed';
    }
  };

  const resetAndClose = () => {
    generationRef.current += 1;
    revisionRef.current += 1;
    openRef.current = false;
    hoursRef.current = '';
    minutesRef.current = '';
    setHours('');
    setMinutes('');
    setErrorMessage(null);
    onClose();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetAndClose();
  };

  const handleHoursChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    revisionRef.current += 1;
    hoursRef.current = event.target.value;
    setHours(event.target.value);
    setErrorMessage(null);
  };

  const handleMinutesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    revisionRef.current += 1;
    minutesRef.current = event.target.value;
    setMinutes(event.target.value);
    setErrorMessage(null);
  };

  const handleWriteSuccess = async (submission: TimeSubmission) => {
    const refreshResult = await refreshSubmittedTask(submission, true);
    if (!mountedRef.current || refreshResult === 'auth') return;

    onSuccess?.();
    const currentSubmission = isCurrentSubmission(submission);
    toast.success(
      currentSubmission
        ? `${submission.totalMinutes}分の作業時間を追加しました。`
        : `先ほど送信した${submission.totalMinutes}分の作業時間を追加しました。`,
    );
    if (refreshResult === 'failed') {
      toast.error(
        '作業時間の追加は完了しましたが、最新の合計を取得できませんでした。画面を開き直して確認してください。',
      );
    }

    if (!currentSubmission) {
      if (openRef.current && taskIdRef.current === submission.taskId) {
        const currentDuration = parseDuration(hoursRef.current, minutesRef.current);
        if (currentDuration.totalMinutes === submission.totalMinutes) {
          toast('先ほどの追加は完了しています。このまま送信すると、作業時間が二重に記録されます。');
        }
      }
      return;
    }
    resetAndClose();
  };

  const handleWriteError = async (error: unknown, submission: TimeSubmission) => {
    if (!mountedRef.current) return;
    const classified = classifyTaskWriteError(error, 'addTime');
    if (classified.kind === 'auth') {
      expireAuth(submission, false);
      return;
    }

    const status = httpStatusOf(error);
    if (status === 403 || classified.kind === 'unknown') {
      const refreshResult = await refreshSubmittedTask(submission, false);
      if (!mountedRef.current || refreshResult === 'auth') return;
      if (refreshResult === 'failed') {
        toast.error('最新のタスクを取得できませんでした。画面を開き直して確認してください。');
      }
    }
    showSubmissionMessage(
      submission,
      classified.message,
      classified.kind === 'unknown' ? 'neutral' : 'error',
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (writeLockedRef.current || authExpiredRef.current) return;

    const duration = parseDuration(hours, minutes);
    if (duration.totalMinutes === null) {
      setErrorMessage({ text: duration.message, tone: 'error' });
      return;
    }

    const submission: TimeSubmission = {
      taskId,
      totalMinutes: duration.totalMinutes,
      hours,
      minutes,
      generation: generationRef.current,
      revision: revisionRef.current,
    };
    writeLockedRef.current = true;
    submissionRef.current = submission;
    setWritePending(true);
    setErrorMessage(null);

    try {
      try {
        await addTimeMutation.mutateAsync({
          id: submission.taskId,
          minutesToAdd: submission.totalMinutes,
        });
      } catch (error) {
        await handleWriteError(error, submission);
        return;
      }
      await handleWriteSuccess(submission);
    } finally {
      if (submissionRef.current === submission) submissionRef.current = null;
      writeLockedRef.current = false;
      if (mountedRef.current) setWritePending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>作業時間の記録</DialogTitle>
            <DialogDescription>タスクに作業時間を記録します</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="hours" className="text-sm font-medium mb-2 block">
                時間
              </Label>
              <Input
                id="hours"
                value={hours}
                onChange={handleHoursChange}
                type="text"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errorMessage?.tone === 'error'}
              />
              <p className="text-xs text-muted-foreground mt-1">作業時間（時）</p>
            </div>
            <div className="flex-1">
              <Label htmlFor="minutes" className="text-sm font-medium mb-2 block">
                分
              </Label>
              <Input
                id="minutes"
                value={minutes}
                onChange={handleMinutesChange}
                type="text"
                inputMode="numeric"
                placeholder="0"
                aria-invalid={errorMessage?.tone === 'error'}
              />
              <p className="text-xs text-muted-foreground mt-1">作業時間（分、0-59）</p>
            </div>
          </div>
          {errorMessage && (
            <p
              className={`text-sm ${errorMessage.tone === 'neutral' ? 'text-foreground' : 'text-destructive'}`}
              role="alert"
            >
              {errorMessage.text}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={writePending || addTimeMutation.isPending || authExpired}
            >
              {writePending || addTimeMutation.isPending ? '追加中...' : '時間を追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

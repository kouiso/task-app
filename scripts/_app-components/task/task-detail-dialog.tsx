'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Separator } from '@/component/ui/separator';
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { formatDateOnly } from '@/lib/date';
import { httpStatusOf, isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { api } from '@/trpc/react';
import { StatusBadge } from './status-badge';

type TaskDetailDialogProps = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onAuthExpired?: () => void;
};

export function TaskDetailDialog({ open, taskId, onClose, onAuthExpired }: TaskDetailDialogProps) {
  const [authExpired, setAuthExpired] = useState(false);
  const {
    data: cachedTask,
    error: taskError,
    failureReason: taskFailure,
    isFetching,
    refetch,
  } = api.task.getById.useQuery(
    { id: taskId ?? '' },
    {
      enabled: open && !!taskId && !authExpired,
      retry: (count, error) => httpStatusOf(error) !== 404 && shouldRetryQuery(count, error),
    },
  );
  const readError = taskError ?? taskFailure;
  const queryAuthFailed = [taskError, taskFailure].some(isAuthError);
  const needsLogin = authExpired || queryAuthFailed;
  const forbidden = [taskError, taskFailure].some(isForbiddenError);
  const notFound = [taskError, taskFailure].some((error) => httpStatusOf(error) === 404);
  const taskDetail = needsLogin || forbidden || notFound ? undefined : cachedTask;

  useEffect(() => {
    if (!queryAuthFailed) return;
    setAuthExpired(true);
    onAuthExpired?.();
  }, [queryAuthFailed, onAuthExpired]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl break-words">
            {taskDetail?.title || 'タスク詳細'}
          </DialogTitle>
          <DialogDescription>
            プロジェクト:{' '}
            <span className="font-semibold text-foreground">{taskDetail?.project.name}</span>
          </DialogDescription>
        </DialogHeader>

        {needsLogin ? (
          <div role="alert" className="space-y-3">
            <p>ログインの有効期限が切れました。もう一度ログインしてください。</p>
            <Button asChild>
              <Link href="/login">ログイン画面へ</Link>
            </Button>
          </div>
        ) : forbidden ? (
          <p role="alert">このタスクを表示する権限がありません。</p>
        ) : notFound ? (
          <p role="alert">タスクが見つかりません。削除された可能性があります。</p>
        ) : readError ? (
          <div role="alert" className="space-y-3">
            <p>
              {taskDetail
                ? '最新のタスク情報を取得できませんでした。前回の内容を表示しています。'
                : 'タスク情報を取得できませんでした。'}
            </p>
            <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
              {isFetching ? '再取得中...' : '再試行'}
            </Button>
          </div>
        ) : !taskDetail ? (
          <p role="status">タスク情報を読み込んでいます...</p>
        ) : null}

        {taskDetail && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {taskDetail.description || '説明はありません。'}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">ステータス</span>
                <StatusBadge status={taskDetail.status} />
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">優先度</span>
                <Badge variant={getPriorityBadgeVariant(taskDetail.priority)}>
                  {TASK_PRIORITY_LABELS[taskDetail.priority] ?? taskDetail.priority}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">担当者</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {taskDetail.assignee?.avatar && (
                      <AvatarImage src={taskDetail.assignee.avatar} alt="" />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {(taskDetail.assignee?.name ||
                        taskDetail.assignee?.email ||
                        '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{taskDetail.assignee?.name || taskDetail.assignee?.email || '未割当'}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">期限</span>
                <span>{taskDetail.dueDate ? formatDateOnly(taskDetail.dueDate) : '期限なし'}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

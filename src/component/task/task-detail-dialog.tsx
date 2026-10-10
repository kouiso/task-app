'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { StatusBadge } from '@/component/task/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import { Separator } from '@/component/ui/separator';
import { Textarea } from '@/component/ui/textarea';
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { hasPermission, isProjectMemberRole } from '@/lib/constant/roles';
import { formatDateOnly } from '@/lib/date';
import { httpStatusOf, isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { classifyTaskWriteError, type TaskWriteOperation } from '@/lib/task-write-error';
import { api } from '@/trpc/react';

type TaskDetailDialogProps = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onAuthExpired?: () => void;
};

const commentSchema = z.object({
  content: z.string().trim().min(1, 'コメントを入力してください'),
});
type CommentFormValues = z.infer<typeof commentSchema>;

const editCommentSchema = z.object({
  content: z.string().trim().min(1, 'コメントを入力してください'),
});
type EditCommentFormValues = z.infer<typeof editCommentSchema>;

type CommentSubmission = {
  taskId: string;
  scope: 'create' | 'editor';
  generation: number;
  formRevision: number;
  content?: string;
  commentId?: string;
};

type CommentWriteOperation = Extract<
  TaskWriteOperation,
  'createComment' | 'updateComment' | 'deleteComment'
>;

const staleFailurePrefixes: Record<CommentWriteOperation, string> = {
  createComment: '先ほど送信したコメントの投稿に失敗しました。',
  updateComment: '先ほど送信したコメントの更新に失敗しました。',
  deleteComment: '先ほど送信したコメントの削除に失敗しました。',
};

export function TaskDetailDialog({ open, taskId, onClose, onAuthExpired }: TaskDetailDialogProps) {
  const [authExpired, setAuthExpired] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [deleteCommentTargetId, setDeleteCommentTargetId] = useState<string | null>(null);
  const [commentWriteError, setCommentWriteError] = useState<string | null>(null);
  const createGenerationRef = useRef(0);
  const editorGenerationRef = useRef(0);
  const createRevisionRef = useRef(0);
  const editRevisionRef = useRef(0);
  const openRef = useRef(open);
  const taskIdRef = useRef(taskId);
  const editingCommentIdRef = useRef<string | null>(null);
  const deleteCommentTargetIdRef = useRef<string | null>(null);
  const writeLockedRef = useRef(false);
  const mountedRef = useRef(false);
  const authExpiredRef = useRef(false);
  const createSubmissionRef = useRef<CommentSubmission | null>(null);
  const updateSubmissionRef = useRef<CommentSubmission | null>(null);
  const deleteSubmissionRef = useRef<CommentSubmission | null>(null);

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const editCommentForm = useForm<EditCommentFormValues>({
    resolver: zodResolver(editCommentSchema),
    defaultValues: { content: '' },
  });

  const utils = api.useUtils();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const subscription = commentForm.watch((_values, { name }) => {
      if (name) createRevisionRef.current += 1;
    });
    return () => subscription.unsubscribe();
  }, [commentForm]);

  useEffect(() => {
    const subscription = editCommentForm.watch((_values, { name }) => {
      if (name) editRevisionRef.current += 1;
    });
    return () => subscription.unsubscribe();
  }, [editCommentForm]);

  useEffect(() => {
    openRef.current = open;
    taskIdRef.current = taskId;
    createGenerationRef.current += 1;
    editorGenerationRef.current += 1;
    editingCommentIdRef.current = null;
    deleteCommentTargetIdRef.current = null;
    commentForm.reset();
    editCommentForm.reset();
    setEditingCommentId(null);
    setDeleteCommentDialogOpen(false);
    setDeleteCommentTargetId(null);
    setCommentWriteError(null);
  }, [commentForm, editCommentForm, open, taskId]);

  const {
    data: session,
    isSuccess: sessionLoaded,
    error: sessionError,
    failureReason: sessionFailure,
    isFetching: sessionFetching,
    refetch: refetchSession,
  } = api.auth.getSession.useQuery(undefined, {
    enabled: open && !authExpired,
    retry: shouldRetryQuery,
  });
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
  const queryAuthFailed =
    [taskError, taskFailure, sessionError, sessionFailure].some(isAuthError) ||
    (sessionLoaded && session === null);
  const needsLogin = authExpired || queryAuthFailed;
  const forbidden = [taskError, taskFailure].some(isForbiddenError);
  const notFound = [taskError, taskFailure].some((error) => httpStatusOf(error) === 404);
  const taskDetail = needsLogin || forbidden || notFound ? undefined : cachedTask;
  const sessionReadFailed = !!sessionError && !isAuthError(sessionError);

  useEffect(() => {
    if (!queryAuthFailed) return;
    authExpiredRef.current = true;
    if (!mountedRef.current) return;
    setAuthExpired(true);
    onAuthExpired?.();
  }, [queryAuthFailed, onAuthExpired]);

  const permissionSession = sessionReadFailed ? undefined : session;
  const memberRole = taskDetail?.project.members.find(
    (member) => member.userId === permissionSession?.user?.id,
  )?.role;
  const canEditComments = isProjectMemberRole(memberRole) && hasPermission(memberRole, 'canEdit');
  const canModifyComment = (commentId: string) =>
    canEditComments &&
    taskDetail?.comments.some(
      (comment) => comment.id === commentId && comment.userId === permissionSession?.user?.id,
    );

  useEffect(() => {
    if (!open || !canEditComments) {
      createGenerationRef.current += 1;
      editorGenerationRef.current += 1;
      editingCommentIdRef.current = null;
      deleteCommentTargetIdRef.current = null;
      setEditingCommentId(null);
      setDeleteCommentDialogOpen(false);
      setDeleteCommentTargetId(null);
      editCommentForm.reset();
    }
  }, [open, canEditComments, editCommentForm]);

  const isCurrentSubmission = (submission: CommentSubmission | null | undefined) =>
    !!submission &&
    open &&
    taskId === submission.taskId &&
    openRef.current &&
    taskIdRef.current === submission.taskId &&
    (submission.scope === 'create' ? createGenerationRef : editorGenerationRef).current ===
      submission.generation;

  const handleRefreshFailure = (
    error: unknown,
    submission: CommentSubmission,
    writeCompleted: boolean,
  ) => {
    if (!mountedRef.current || authExpiredRef.current) return;
    if (isAuthError(error)) {
      authExpiredRef.current = true;
      setAuthExpired(true);
      onAuthExpired?.();
      return;
    }
    const currentSubmission = isCurrentSubmission(submission);
    const message = writeCompleted
      ? currentSubmission
        ? 'コメントの操作は完了しましたが、最新のコメントを取得できませんでした。画面を閉じて開き直してください。'
        : '先ほど送信したコメントの操作は完了しましたが、最新のコメントを取得できませんでした。画面を閉じて開き直してください。'
      : currentSubmission
        ? '最新のコメントを取得できませんでした。画面を閉じて開き直してください。'
        : '先ほど送信したコメントの対象について、最新のコメントを取得できませんでした。画面を閉じて開き直してください。';
    if (writeCompleted && currentSubmission) {
      setCommentWriteError(message);
    } else {
      toast.error(message);
    }
  };

  const invalidateSubmittedTask = (submission: CommentSubmission | null | undefined) => {
    if (!submission || !mountedRef.current || authExpiredRef.current) return;
    void Promise.resolve(
      utils.task.getById.invalidate({ id: submission.taskId }, undefined, { throwOnError: true }),
    ).catch((error: unknown) => handleRefreshFailure(error, submission, true));
  };

  const refreshAfterWriteError = (
    submission: CommentSubmission | null | undefined,
    withoutRefetch: boolean,
  ) => {
    if (!submission || !mountedRef.current || (authExpiredRef.current && !withoutRefetch)) return;
    void Promise.resolve(
      utils.task.getById.invalidate(
        { id: submission.taskId },
        withoutRefetch ? { refetchType: 'none' } : undefined,
        { throwOnError: true },
      ),
    ).catch((error: unknown) => handleRefreshFailure(error, submission, false));
  };

  const handleWriteError = (
    error: unknown,
    operation: CommentWriteOperation,
    submission: CommentSubmission | null | undefined,
  ) => {
    if (!mountedRef.current || authExpiredRef.current) return;
    const classified = classifyTaskWriteError(error, operation);
    if (classified.kind === 'auth') {
      authExpiredRef.current = true;
      refreshAfterWriteError(submission, true);
      setAuthExpired(true);
      onAuthExpired?.();
      return;
    } else {
      refreshAfterWriteError(submission, false);
    }
    if (isCurrentSubmission(submission)) {
      setCommentWriteError(classified.message);
    } else {
      toast.error(`${staleFailurePrefixes[operation]}${classified.message}`);
    }
  };

  const releaseWriteLock = () => {
    writeLockedRef.current = false;
  };

  const createCommentMutation = api.comment.create.useMutation({
    retry: false,
    onMutate: () => createSubmissionRef.current,
    onSuccess: (_data, _variables, submission) => {
      if (!mountedRef.current || authExpiredRef.current) return;
      const currentSubmission = isCurrentSubmission(submission);
      toast.success(
        currentSubmission ? 'コメントを投稿しました。' : '先ほど送信したコメントを投稿しました。',
      );
      invalidateSubmittedTask(submission);
      if (
        !currentSubmission &&
        submission &&
        open &&
        openRef.current &&
        taskId === submission.taskId &&
        taskIdRef.current === submission.taskId &&
        commentForm.getValues('content').trim() === submission.content
      ) {
        toast(
          '先ほどの投稿は完了しています。残った入力をこのまま投稿すると重複する可能性があります。',
        );
      }
      if (!currentSubmission) return;
      if (createRevisionRef.current === submission?.formRevision) {
        commentForm.reset();
      } else {
        toast(
          '送信後の変更は保存されていません。このまま投稿すると、同じ内容が重複する可能性があります。',
        );
      }
    },
    onError: (error, _variables, submission) =>
      handleWriteError(error, 'createComment', submission),
    onSettled: releaseWriteLock,
  });

  const updateCommentMutation = api.comment.update.useMutation({
    retry: false,
    onMutate: () => updateSubmissionRef.current,
    onSuccess: (_data, _variables, submission) => {
      if (!mountedRef.current || authExpiredRef.current) return;
      const currentSubmission = isCurrentSubmission(submission);
      toast.success(
        currentSubmission ? 'コメントを更新しました。' : '先ほど送信したコメントを更新しました。',
      );
      invalidateSubmittedTask(submission);
      if (!currentSubmission || editingCommentIdRef.current !== submission?.commentId) return;
      if (editRevisionRef.current === submission.formRevision) {
        editingCommentIdRef.current = null;
        setEditingCommentId(null);
        editCommentForm.reset();
      } else {
        toast(
          '送信後に入力した変更は保存されていません。入力内容を別の場所にコピーしてから「キャンセル」を押し、コメントをもう一度編集して保存してください。',
        );
      }
    },
    onError: (error, _variables, submission) =>
      handleWriteError(error, 'updateComment', submission),
    onSettled: releaseWriteLock,
  });

  const deleteCommentMutation = api.comment.delete.useMutation({
    retry: false,
    onMutate: () => deleteSubmissionRef.current,
    onSuccess: (_data, _variables, submission) => {
      if (!mountedRef.current || authExpiredRef.current) return;
      const currentSubmission = isCurrentSubmission(submission);
      toast.success(
        currentSubmission ? 'コメントを削除しました。' : '先ほど送信したコメントを削除しました。',
      );
      invalidateSubmittedTask(submission);
      if (currentSubmission && deleteCommentTargetIdRef.current === submission?.commentId) {
        deleteCommentTargetIdRef.current = null;
        setDeleteCommentDialogOpen(false);
        setDeleteCommentTargetId(null);
      }
    },
    onError: (error, _variables, submission) =>
      handleWriteError(error, 'deleteComment', submission),
    onSettled: releaseWriteLock,
  });

  const commentWritePending =
    createCommentMutation.isPending ||
    updateCommentMutation.isPending ||
    deleteCommentMutation.isPending;

  const handleClose = () => {
    createGenerationRef.current += 1;
    editorGenerationRef.current += 1;
    openRef.current = false;
    commentForm.reset();
    editCommentForm.reset();
    setEditingCommentId(null);
    editingCommentIdRef.current = null;
    setDeleteCommentDialogOpen(false);
    setDeleteCommentTargetId(null);
    deleteCommentTargetIdRef.current = null;
    setCommentWriteError(null);
    onClose();
  };

  const handleCommentSubmit = (
    _values: CommentFormValues,
    submission: CommentSubmission | null,
  ) => {
    if (
      !submission ||
      submission.content === undefined ||
      !canEditComments ||
      writeLockedRef.current
    )
      return;
    writeLockedRef.current = true;
    setCommentWriteError(null);
    createSubmissionRef.current = submission;
    createCommentMutation.mutate({
      content: submission.content,
      taskId: submission.taskId,
    });
  };

  const handleCommentSubmitEvent = (event: FormEvent<HTMLFormElement>) => {
    const submittedTaskId = taskIdRef.current;
    const submission = submittedTaskId
      ? {
          taskId: submittedTaskId,
          scope: 'create' as const,
          generation: createGenerationRef.current,
          formRevision: createRevisionRef.current,
          content: commentForm.getValues('content').trim(),
        }
      : null;
    void commentForm.handleSubmit((values) => handleCommentSubmit(values, submission))(event);
  };

  const handleStartEdit = (comment: { id: string; content: string }) => {
    if (!canModifyComment(comment.id)) return;
    editorGenerationRef.current += 1;
    editingCommentIdRef.current = comment.id;
    setEditingCommentId(comment.id);
    editCommentForm.setValue('content', comment.content);
  };

  const handleCancelEdit = () => {
    editorGenerationRef.current += 1;
    editingCommentIdRef.current = null;
    setEditingCommentId(null);
    editCommentForm.reset();
  };

  const handleSaveEdit = (commentId: string) => {
    const content = editCommentForm.getValues('content').trim();
    const submittedTaskId = taskIdRef.current;
    if (!content || !submittedTaskId || !canModifyComment(commentId) || writeLockedRef.current)
      return;
    writeLockedRef.current = true;
    setCommentWriteError(null);
    updateSubmissionRef.current = {
      taskId: submittedTaskId,
      scope: 'editor',
      generation: editorGenerationRef.current,
      formRevision: editRevisionRef.current,
      commentId,
    };
    updateCommentMutation.mutate({
      id: commentId,
      content,
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!canModifyComment(commentId) || writeLockedRef.current) return;
    editorGenerationRef.current += 1;
    setCommentWriteError(null);
    deleteCommentTargetIdRef.current = commentId;
    setDeleteCommentTargetId(commentId);
    setDeleteCommentDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
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
                    <span>
                      {taskDetail.assignee?.name || taskDetail.assignee?.email || '未割当'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">期限</span>
                  <span>
                    {taskDetail.dueDate ? formatDateOnly(taskDetail.dueDate) : '期限なし'}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">コメント</h3>
                  <Badge variant="secondary" className="rounded-full px-2">
                    {taskDetail.comments?.length ?? 0}
                  </Badge>
                </div>

                {sessionReadFailed && (
                  <div role="alert" className="mb-4 rounded-md border border-destructive p-3">
                    <p className="text-sm">
                      コメントの権限情報を取得できませんでした。権限を確認できるまで投稿や編集は利用できません。
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      aria-label="コメント権限を再試行"
                      disabled={sessionFetching}
                      onClick={() => void refetchSession()}
                    >
                      {sessionFetching ? '再取得中...' : '再試行'}
                    </Button>
                  </div>
                )}

                {commentWriteError && <p role="alert">{commentWriteError}</p>}

                <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
                  {taskDetail.comments?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      コメントはまだありません。
                    </p>
                  )}
                  {taskDetail.comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="h-8 w-8 mt-1">
                        {comment.user.avatar && <AvatarImage src={comment.user.avatar} alt="" />}
                        <AvatarFallback>
                          {(comment.user.name || comment.user.email || '?')[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {comment.user.name || comment.user.email}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), 'yyyy/MM/dd HH:mm', {
                                locale: ja,
                              })}
                            </span>
                            {canModifyComment(comment.id) && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  aria-label="コメントを編集"
                                  onClick={() => handleStartEdit(comment)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  aria-label="コメントを削除"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={commentWritePending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === comment.id && canModifyComment(comment.id) ? (
                          <div className="space-y-2">
                            <Textarea
                              {...editCommentForm.register('content')}
                              className="resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                キャンセル
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(comment.id)}
                                disabled={
                                  !editCommentForm.watch('content').trim() || commentWritePending
                                }
                              >
                                {updateCommentMutation.isPending ? '更新中...' : '更新'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {canEditComments && (
                  <form onSubmit={handleCommentSubmitEvent} className="space-y-2">
                    <Textarea
                      placeholder="コメントを追加..."
                      aria-label="コメント本文"
                      {...commentForm.register('content')}
                      className="resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!commentForm.watch('content').trim() || commentWritePending}
                      >
                        {createCommentMutation.isPending ? '投稿中...' : 'コメント投稿'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleClose}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={
          open &&
          deleteCommentDialogOpen &&
          !!deleteCommentTargetId &&
          !!canModifyComment(deleteCommentTargetId)
        }
        onOpenChange={(isOpen) => {
          if (isOpen && writeLockedRef.current) return;
          if (!isOpen) {
            editorGenerationRef.current += 1;
            deleteCommentTargetIdRef.current = null;
            setDeleteCommentTargetId(null);
          }
          setDeleteCommentDialogOpen(isOpen);
        }}
        onConfirm={() => {
          if (
            taskId &&
            deleteCommentTargetId &&
            canModifyComment(deleteCommentTargetId) &&
            !writeLockedRef.current
          ) {
            writeLockedRef.current = true;
            setCommentWriteError(null);
            deleteSubmissionRef.current = {
              taskId,
              scope: 'editor',
              generation: editorGenerationRef.current,
              formRevision: 0,
              commentId: deleteCommentTargetId,
            };
            deleteCommentMutation.mutate({ id: deleteCommentTargetId });
          }
        }}
        isPending={deleteCommentMutation.isPending}
        closeOnConfirm={false}
        title="コメントを削除しますか？"
        description={commentWriteError ?? 'この操作は取り消せません。'}
      />
    </>
  );
}

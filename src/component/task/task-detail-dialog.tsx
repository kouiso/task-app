'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { getPriorityBadgeVariant, getStatusBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { TASK_STATUS_LABELS } from '@/lib/constant/status';
import { api } from '@/trpc/react';

type TaskDetailDialogProps = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
};

const commentSchema = z.object({
  content: z.string().min(1, 'コメントを入力してください').trim(),
});
type CommentFormValues = z.infer<typeof commentSchema>;

const editCommentSchema = z.object({
  content: z.string().min(1, 'コメントを入力してください').trim(),
});
type EditCommentFormValues = z.infer<typeof editCommentSchema>;

export function TaskDetailDialog({ open, taskId, onClose }: TaskDetailDialogProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [deleteCommentTargetId, setDeleteCommentTargetId] = useState<string | null>(null);

  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const editCommentForm = useForm<EditCommentFormValues>({
    resolver: zodResolver(editCommentSchema),
    defaultValues: { content: '' },
  });

  const utils = api.useUtils();

  const { data: session } = api.auth.getSession.useQuery();
  const { data: taskDetail } = api.task.getById.useQuery(
    { id: taskId ?? '' },
    { enabled: !!taskId },
  );

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.task.getById.invalidate({ id: taskId });
      }
      commentForm.reset();
    },
  });

  const updateCommentMutation = api.comment.update.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.task.getById.invalidate({ id: taskId });
      }
      setEditingCommentId(null);
      editCommentForm.reset();
    },
  });

  const deleteCommentMutation = api.comment.delete.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.task.getById.invalidate({ id: taskId });
      }
    },
  });

  const handleClose = () => {
    commentForm.reset();
    editCommentForm.reset();
    setEditingCommentId(null);
    setDeleteCommentDialogOpen(false);
    setDeleteCommentTargetId(null);
    onClose();
  };

  const handleCommentSubmit = (values: CommentFormValues) => {
    if (!taskId) return;
    createCommentMutation.mutate({
      content: values.content,
      taskId,
    });
  };

  const handleStartEdit = (comment: { id: string; content: string }) => {
    setEditingCommentId(comment.id);
    editCommentForm.setValue('content', comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    editCommentForm.reset();
  };

  const handleSaveEdit = (commentId: string) => {
    const content = editCommentForm.getValues('content').trim();
    if (!content) return;
    updateCommentMutation.mutate({
      id: commentId,
      content,
    });
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteCommentTargetId(commentId);
    setDeleteCommentDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{taskDetail?.title}</DialogTitle>
            <DialogDescription>
              プロジェクト:{' '}
              <span className="font-semibold text-foreground">{taskDetail?.project.name}</span>
            </DialogDescription>
          </DialogHeader>

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
                  <Badge variant={getStatusBadgeVariant(taskDetail.status)}>
                    {TASK_STATUS_LABELS[taskDetail.status] ?? taskDetail.status}
                  </Badge>
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
                        <AvatarImage src={taskDetail.assignee.avatar} />
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
                    {taskDetail.dueDate
                      ? format(new Date(taskDetail.dueDate), 'yyyy/MM/dd', { locale: ja })
                      : '期限なし'}
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

                <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
                  {taskDetail.comments?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      コメントはまだありません。
                    </p>
                  )}
                  {taskDetail.comments?.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="h-8 w-8 mt-1">
                        {comment.user.avatar && <AvatarImage src={comment.user.avatar} />}
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
                            {comment.userId === session?.user?.id && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleStartEdit(comment)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingCommentId === comment.id ? (
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
                                  !editCommentForm.watch('content').trim() ||
                                  updateCommentMutation.isPending
                                }
                              >
                                {updateCommentMutation.isPending ? '更新中...' : '更新'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={commentForm.handleSubmit(handleCommentSubmit)}
                  className="space-y-2"
                >
                  <Textarea
                    placeholder="コメントを追加..."
                    {...commentForm.register('content')}
                    className="resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        !commentForm.watch('content').trim() || createCommentMutation.isPending
                      }
                    >
                      {createCommentMutation.isPending ? '投稿中...' : 'コメント投稿'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleClose}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteCommentDialogOpen}
        onOpenChange={setDeleteCommentDialogOpen}
        onConfirm={() => {
          if (deleteCommentTargetId) {
            deleteCommentMutation.mutate({ id: deleteCommentTargetId });
          }
        }}
        isPending={deleteCommentMutation.isPending}
        title="コメントを削除しますか？"
      />
    </>
  );
}

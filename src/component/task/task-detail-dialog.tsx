'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
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
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import { hasPermission, isProjectMemberRole } from '@/lib/constant/roles';
import { formatDateOnly } from '@/lib/date';
import { api } from '@/trpc/react';
import { StatusBadge } from './status-badge';

type TaskDetailDialogProps = {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
};

const commentSchema = z.object({
  content: z.string().trim().min(1, 'コメントを入力してください'),
});
type CommentFormValues = z.infer<typeof commentSchema>;

const editCommentSchema = z.object({
  content: z.string().trim().min(1, 'コメントを入力してください'),
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

  const memberRole = taskDetail?.project.members.find(
    (member) => member.userId === session?.user?.id,
  )?.role;
  const canEditComments = isProjectMemberRole(memberRole) && hasPermission(memberRole, 'canEdit');
  const canModifyComment = (commentId: string) =>
    canEditComments &&
    taskDetail?.comments.some(
      (comment) => comment.id === commentId && comment.userId === session?.user?.id,
    );

  // 送信応答が返る頃には下書きや操作状態が変わっている可能性があるため、
  // 送信時点の状態を世代（generation）と編集回数（revision）で記録して成功時に照合する。
  // 作成と編集で世代を分け、別々の下書きが互いの成功応答に巻き込まれないようにする。
  // 作成世代は開閉・taskId変化・権限喪失で、編集世代は編集の開始・取り消し・
  // 削除確認の開閉で進める。世代がずれた成功は別セッションのものとして触れない。
  const createGenerationRef = useRef(0);
  const editGenerationRef = useRef(0);
  const createRevisionRef = useRef(0);
  const editRevisionRef = useRef(0);
  const createSubmitRef = useRef<{ generation: number; revision: number } | null>(null);
  const updateSubmitRef = useRef<{ generation: number; revision: number } | null>(null);
  const deleteSubmitRef = useRef<{ generation: number } | null>(null);

  // open/taskId が変わるたびに別のコメントセッションとみなし、作成世代を進める
  const prevCreateSessionRef = useRef({ open, taskId });
  if (
    prevCreateSessionRef.current.open !== open ||
    prevCreateSessionRef.current.taskId !== taskId
  ) {
    prevCreateSessionRef.current = { open, taskId };
    createGenerationRef.current += 1;
    createRevisionRef.current = 0;
  }

  // 削除確認ダイアログの開閉は編集世代を進める
  const prevDeleteDialogOpenRef = useRef(deleteCommentDialogOpen);
  if (prevDeleteDialogOpenRef.current !== deleteCommentDialogOpen) {
    prevDeleteDialogOpenRef.current = deleteCommentDialogOpen;
    editGenerationRef.current += 1;
  }

  useEffect(() => {
    if (!canEditComments) {
      // 権限を失った時点の下書きと送信の帰属を切り離す
      createGenerationRef.current += 1;
      setEditingCommentId(null);
      setDeleteCommentDialogOpen(false);
      setDeleteCommentTargetId(null);
      editCommentForm.reset();
    }
  }, [canEditComments, editCommentForm]);

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.task.getById.invalidate({ id: taskId });
      }
      // 成功通知はフォームをリセットする・しないに関係なく必ず出す
      toast.success('コメントを投稿しました');
      const snapshot = createSubmitRef.current;
      if (!snapshot || snapshot.generation !== createGenerationRef.current) {
        return;
      }
      if (snapshot.revision !== createRevisionRef.current) {
        // 送信後に書き足された下書きは投稿内容と違うので残して理由を伝える
        toast('送信後の変更は保存されていません。このまま投稿すると別のコメントになります');
        return;
      }
      commentForm.reset();
    },
  });

  const updateCommentMutation = api.comment.update.useMutation({
    onSuccess: () => {
      if (taskId) {
        utils.task.getById.invalidate({ id: taskId });
      }
      toast.success('コメントを更新しました');
      const snapshot = updateSubmitRef.current;
      if (!snapshot || snapshot.generation !== editGenerationRef.current) {
        return;
      }
      if (snapshot.revision !== editRevisionRef.current) {
        toast('送信後の変更は保存されていません。もう一度更新すると反映されます');
        return;
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
      toast.success('コメントを削除しました');
      const snapshot = deleteSubmitRef.current;
      if (!snapshot || snapshot.generation !== editGenerationRef.current) {
        return;
      }
      setDeleteCommentDialogOpen(false);
      setDeleteCommentTargetId(null);
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
    if (!taskId || !canEditComments) return;
    createSubmitRef.current = {
      generation: createGenerationRef.current,
      revision: createRevisionRef.current,
    };
    createCommentMutation.mutate({
      content: values.content,
      taskId,
    });
  };

  const handleStartEdit = (comment: { id: string; content: string }) => {
    if (!canModifyComment(comment.id)) return;
    editGenerationRef.current += 1;
    editRevisionRef.current = 0;
    setEditingCommentId(comment.id);
    editCommentForm.setValue('content', comment.content);
  };

  const handleCancelEdit = () => {
    editGenerationRef.current += 1;
    setEditingCommentId(null);
    editCommentForm.reset();
  };

  const handleSaveEdit = (commentId: string) => {
    const content = editCommentForm.getValues('content').trim();
    if (!content || !canModifyComment(commentId)) return;
    updateSubmitRef.current = {
      generation: editGenerationRef.current,
      revision: editRevisionRef.current,
    };
    updateCommentMutation.mutate({
      id: commentId,
      content,
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!canModifyComment(commentId)) return;
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
                              {...editCommentForm.register('content', {
                                onChange: () => {
                                  editRevisionRef.current += 1;
                                },
                              })}
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

                {canEditComments && (
                  <form
                    onSubmit={commentForm.handleSubmit(handleCommentSubmit)}
                    className="space-y-2"
                  >
                    <Textarea
                      placeholder="コメントを追加..."
                      aria-label="コメント本文"
                      {...commentForm.register('content', {
                        onChange: () => {
                          createRevisionRef.current += 1;
                        },
                      })}
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
          deleteCommentDialogOpen &&
          !!deleteCommentTargetId &&
          !!canModifyComment(deleteCommentTargetId)
        }
        onOpenChange={setDeleteCommentDialogOpen}
        onConfirm={() => {
          if (deleteCommentTargetId && canModifyComment(deleteCommentTargetId)) {
            deleteSubmitRef.current = { generation: editGenerationRef.current };
            deleteCommentMutation.mutate({ id: deleteCommentTargetId });
          }
        }}
        isPending={deleteCommentMutation.isPending}
        title="コメントを削除しますか？"
      />
    </>
  );
}

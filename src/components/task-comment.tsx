'use client';
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  MoreVert,
  Edit,
  Delete,
  Comment as CommentIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ja';

dayjs.extend(relativeTime);
dayjs.locale('ja');
import { useSession } from 'next-auth/react';
import { api } from '@/lib/trpc/client';

interface TaskCommentsProps {
  taskId: string;
}

const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // コメント一覧取得
  const {
    data: comments = [],
    isLoading,
    error,
  } = api.comment.getByTaskId.useQuery(
    { taskId },
    {
      refetchInterval: 30000, // 30秒ごとに自動更新
    }
  );

  // コメント作成
  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      setNewComment('');
    },
  });

  // コメント更新
  const updateCommentMutation = api.comment.update.useMutation({
    onSuccess: () => {
      setEditingComment(null);
      setEditContent('');
    },
  });

  // コメント削除
  const deleteCommentMutation = api.comment.delete.useMutation({
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelectedComment(null);
    },
  });

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createCommentMutation.mutate({
      content: newComment.trim(),
      taskId,
    });
  };

  const handleEditComment = (comment: typeof comments[0]) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    setAnchorEl(null);
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editContent.trim()) return;

    updateCommentMutation.mutate({
      id: editingComment,
      content: editContent.trim(),
    });
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) return;

    deleteCommentMutation.mutate({ id: selectedComment });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, commentId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedComment(commentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedComment(null);
  };

  const canEditComment = (comment: typeof comments[0]) => {
    return session?.user?.id === comment.user.id;
  };  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center">
        コメントの読み込みに失敗しました
      </Typography>
    );
  }

  return (
    <Box>
      {/* ヘッダー */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <CommentIcon color="primary" />
        <Typography variant="h6">
          コメント
        </Typography>
        <Chip
          label={comments.length}
          size="small"
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* 新規コメント入力 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmitComment}>
            <Box display="flex" gap={2}>
              <Avatar
                src={undefined} // アバター機能は後で実装
                sx={{ width: 32, height: 32 }}
              >
                {session?.user?.name?.charAt(0)}
              </Avatar>
              <Box flex={1}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="コメントを入力..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Send />}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    size="small"
                  >
                    {createCommentMutation.isPending ? '投稿中...' : '投稿'}
                  </Button>
                </Box>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* コメントリスト */}
      <Box>
        {comments.length === 0 ? (
          <Typography color="text.secondary" align="center" py={4}>
            まだコメントはありません
          </Typography>
        ) : (
          comments.map((comment, index) => (
            <Box key={comment.id}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" gap={2}>
                    <Avatar
                      src={comment.user.avatar || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {comment.user.name?.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {comment.user.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {dayjs(comment.createdAt).fromNow()}
                            {comment.updatedAt !== comment.createdAt && ' (編集済み)'}
                          </Typography>
                        </Box>
                        {canEditComment(comment) && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, comment.id)}
                          >
                            <MoreVert />
                          </IconButton>
                        )}
                      </Box>

                      {editingComment === comment.id ? (
                        <Box mt={2}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            variant="outlined"
                            size="small"
                          />
                          <Box mt={2} display="flex" gap={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingComment(null);
                                setEditContent('');
                              }}
                            >
                              キャンセル
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleUpdateComment}
                              disabled={!editContent.trim() || updateCommentMutation.isPending}
                            >
                              {updateCommentMutation.isPending ? '更新中...' : '更新'}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" mt={1} sx={{ whiteSpace: 'pre-wrap' }}>
                          {comment.content}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              {index < comments.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))
        )}
      </Box>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const comment = comments.find((c) => c.id === selectedComment);
            if (comment) handleEditComment(comment);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            setAnchorEl(null);
          }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>コメントを削除</DialogTitle>
        <DialogContent>
          <Typography>
            このコメントを削除しますか？この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteComment}
            color="error"
            variant="contained"
            disabled={deleteCommentMutation.isPending}
          >
            {deleteCommentMutation.isPending ? '削除中...' : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskComments;

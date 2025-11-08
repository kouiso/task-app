'use client';

import { api } from '@/trpc/react';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function UserEditPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    role: 'USER' as 'USER' | 'ADMIN',
    isActive: true,
  });

  // 現在のユーザー情報を取得
  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  // 対象ユーザー情報を取得
  const { data: user, isLoading } = api.user.getById.useQuery({ id: userId });

  // ユーザー更新mutation
  const updateUser = api.user.updateUser.useMutation({
    onSuccess: () => {
      toast.success('ユーザー情報を更新しました');
      router.push(`/users/${userId}`);
    },
    onError: (error) => {
      toast.error(error.message || 'ユーザー情報の更新に失敗しました');
    },
  });

  // ユーザー情報を取得したらフォームにセット
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        avatar: user.avatar || '',
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      id: userId,
      ...formData,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography>ユーザーが見つかりません</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  // 権限チェック：管理者のみ編集可能
  const isAdmin = currentUser?.role === 'ADMIN';
  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              アクセス権限がありません
            </Typography>
            <Typography color="text.secondary">管理者のみユーザー編集が可能です</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* 戻るボタン */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/users/${userId}`)}
        sx={{ mb: 2 }}
      >
        戻る
      </Button>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            ユーザー編集
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }} noValidate>
            {/* アバタープレビュー */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Avatar
                src={formData.avatar || undefined}
                alt={formData.name}
                sx={{ width: 100, height: 100 }}
              >
                {formData.name?.[0]?.toUpperCase()}
              </Avatar>
            </Box>

            {/* 名前 */}
            <TextField
              fullWidth
              label="名前"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              margin="normal"
              disabled={updateUser.isPending}
            />

            {/* メールアドレス（編集不可） */}
            <TextField
              fullWidth
              label="メールアドレス"
              value={user.email}
              disabled
              margin="normal"
              helperText="メールアドレスは変更できません"
            />

            {/* アバターURL */}
            <TextField
              fullWidth
              label="アバターURL（任意）"
              name="avatar"
              type="url"
              value={formData.avatar}
              onChange={handleChange}
              margin="normal"
              disabled={updateUser.isPending}
              helperText="画像のURLを入力してください"
            />

            {/* ロール選択 */}
            <FormControl fullWidth margin="normal">
              <InputLabel>ロール</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="ロール"
                disabled={updateUser.isPending}
              >
                <MenuItem value="USER">ユーザー</MenuItem>
                <MenuItem value="ADMIN">管理者</MenuItem>
              </Select>
            </FormControl>

            {/* アクティブ状態 */}
            <FormControlLabel
              control={
                <Checkbox
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  disabled={updateUser.isPending}
                />
              }
              label="アクティブ"
            />

            {/* エラーメッセージ */}
            {updateUser.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {updateUser.error.message}
              </Alert>
            )}

            {/* ボタン */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={updateUser.isPending} fullWidth>
                {updateUser.isPending ? '更新中...' : '更新'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push(`/users/${userId}`)}
                disabled={updateUser.isPending}
                fullWidth
              >
                キャンセル
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

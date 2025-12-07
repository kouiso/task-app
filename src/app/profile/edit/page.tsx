'use client';

import { api } from '@/trpc/react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ProfileEditPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
  });

  // 現在のユーザー情報を取得
  const { data: currentUser, isLoading } = api.auth.getCurrentUser.useQuery();

  // プロフィール更新mutation
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('プロフィールを更新しました');
      router.push('/profile');
    },
    onError: (error) => {
      toast.error(error.message || 'プロフィールの更新に失敗しました');
    },
  });

  // ユーザー情報を取得したらフォームにセット
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        avatar: currentUser.avatar || '',
      });
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            プロフィール編集
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }} noValidate>
            {/* アバタープレビュー */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Avatar
                {...(formData.avatar && { src: formData.avatar })}
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
              disabled={updateProfile.isPending}
            />

            {/* メールアドレス */}
            <TextField
              fullWidth
              label="メールアドレス"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              margin="normal"
              disabled={updateProfile.isPending}
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
              disabled={updateProfile.isPending}
              helperText="画像のURLを入力してください"
            />

            {/* エラーメッセージ */}
            {updateProfile.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {updateProfile.error.message}
              </Alert>
            )}

            {/* ボタン */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={updateProfile.isPending}
                fullWidth
              >
                {updateProfile.isPending ? '更新中...' : '更新'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/profile')}
                disabled={updateProfile.isPending}
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

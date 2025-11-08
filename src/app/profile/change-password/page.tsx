'use client';

import { api } from '@/trpc/react';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // パスワード変更mutation
  const changePassword = api.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('パスワードを変更しました');
      router.push('/profile');
    },
    onError: (error) => {
      toast.error(error.message || 'パスワードの変更に失敗しました');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // クライアント側バリデーション
    if (formData.newPassword.length < 8) {
      toast.error('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('パスワードが一致しません');
      return;
    }

    changePassword.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleShowPassword = (field: keyof typeof showPassword) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            パスワード変更
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }} noValidate>
            {/* 現在のパスワード */}
            <TextField
              fullWidth
              label="現在のパスワード"
              name="currentPassword"
              type={showPassword.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={handleChange}
              required
              margin="normal"
              disabled={changePassword.isPending}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleShowPassword('current')} edge="end">
                      {showPassword.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* 新しいパスワード */}
            <TextField
              fullWidth
              label="新しいパスワード"
              name="newPassword"
              type={showPassword.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange}
              required
              margin="normal"
              disabled={changePassword.isPending}
              helperText="8文字以上で入力してください"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleShowPassword('new')} edge="end">
                      {showPassword.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* パスワード確認 */}
            <TextField
              fullWidth
              label="新しいパスワード（確認）"
              name="confirmPassword"
              type={showPassword.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              margin="normal"
              disabled={changePassword.isPending}
              error={
                formData.confirmPassword !== '' && formData.newPassword !== formData.confirmPassword
              }
              helperText={
                formData.confirmPassword !== '' && formData.newPassword !== formData.confirmPassword
                  ? 'パスワードが一致しません'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleShowPassword('confirm')} edge="end">
                      {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* エラーメッセージ */}
            {changePassword.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {changePassword.error.message}
              </Alert>
            )}

            {/* ボタン */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={changePassword.isPending}
                fullWidth
              >
                {changePassword.isPending ? '変更中...' : '変更'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/profile')}
                disabled={changePassword.isPending}
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

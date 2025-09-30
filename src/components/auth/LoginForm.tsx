'use client';

import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('ログイン中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.50',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
              Task App
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              タスク管理システムにログイン
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="email"
              control={control}
              rules={{
                required: 'メールアドレスを入力してください',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '有効なメールアドレスを入力してください',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="メールアドレス"
                  type="email"
                  fullWidth
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isLoading}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{
                required: 'パスワードを入力してください',
                minLength: {
                  value: 6,
                  message: 'パスワードは6文字以上で入力してください',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="パスワード"
                  type="password"
                  fullWidth
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isLoading}
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              デモアカウント
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: admin@example.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Password: password
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

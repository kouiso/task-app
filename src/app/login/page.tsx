'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/component/ui/card';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { isValidRedirectUrl } from '@/lib/redirect';
import { api } from '@/trpc/react';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();

  // callbackUrl の検証：相対パスのみを許可
  const rawCallbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const callbackUrl = isValidRedirectUrl(rawCallbackUrl) ? rawCallbackUrl : '/dashboard';
  const registrationCompleted = searchParams?.get('registered') === '1';

  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success(`おかえりなさい、${data.user.name}さん`);
      // 原因未特定のIssue #98に対し、既存の画面切り替えの状態に依存せず全体を読み直すため。
      // 現在の履歴項目も置き換え、ログイン画面を戻る先に残さないため。
      window.location.replace(callbackUrl);
    },
    onError: (error) => {
      setError(error.message ?? 'ログイン中にエラーが発生しました');
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      <Card className="w-full max-w-sm relative z-10 bg-card/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary p-3 shadow-lg">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>アカウントにログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {registrationCompleted && (
              <Alert role="status">
                <AlertTitle>登録が完了しました</AlertTitle>
                <AlertDescription>ログインしてください。</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                aria-required="true"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-required="true"
                {...register('password')}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full shadow-md" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'ログイン中...' : 'ログイン'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link
                href="/register"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                新規登録
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex min-h-screen items-center justify-center">読み込み中...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}

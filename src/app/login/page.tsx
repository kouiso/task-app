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
import { api } from '@/trpc/react';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Open Redirect対策：URL が相対パスで同一オリジンであることを検証
 */
function isValidRedirectUrl(url: string): boolean {
  if (!url) return false;

  // プロトコル相対URL（//example.com）は許可しない
  if (url.startsWith('//')) return false;

  // 外部URLは許可しない
  if (url.startsWith('http://') || url.startsWith('https://')) return false;

  // 相対パスのみを許可
  return url.startsWith('/');
}

function LoginForm() {
  const searchParams = useSearchParams();

  // callbackUrl の検証：相対パスのみを許可
  const rawCallbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const callbackUrl = isValidRedirectUrl(rawCallbackUrl) ? rawCallbackUrl : '/dashboard';

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
      // tRPC レスポンスで Set-Cookie された session を確実にブラウザへ反映してから
      // middleware 配下のページへ遷移する。router.push/refresh だと
      // cookie 反映と RSC 再フェッチのタイミング次第で middleware が未認証と判断し
      // /login に戻されるレースが起きる (Issue #98、2 回目以降は cookie が乗って正常遷移)
      // replace を使うことで /login を履歴から除去し、戻るボタンでログイン画面に戻らないようにする
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
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
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
                こちら
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

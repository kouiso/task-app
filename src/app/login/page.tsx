'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
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
  const router = useRouter();
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
      router.push(callbackUrl);
      router.refresh();
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
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      <Card className="w-full max-w-sm relative z-10 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 p-3 shadow-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>アカウントにログインしてください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'ログイン中...' : 'ログイン'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              アカウントをお持ちでない方は{' '}
              <Link
                href="/register"
                className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
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

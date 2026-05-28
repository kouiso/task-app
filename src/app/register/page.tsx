'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/component/ui/card';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { api } from '@/trpc/react';

const registerSchema = z
  .object({
    name: z.string().min(1, '名前を入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string().min(1, 'パスワード(確認)を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = api.auth.register.useMutation({
    onSuccess: () => {
      router.push('/login');
    },
    onError: (err) => {
      try {
        const parsed: unknown = JSON.parse(err.message);
        if (Array.isArray(parsed)) {
          const messages = parsed
            .filter((item): item is { message: string } => typeof item?.message === 'string')
            .map((item) => item.message);
          if (messages.length > 0) {
            setError(messages);
            return;
          }
        }
      } catch {
        // not JSON — fall through to plain message
      }
      setError([err.message ?? 'ユーザー登録中にエラーが発生しました']);
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError([]);
    registerMutation.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-blue-700 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      <Card className="w-full max-w-sm relative z-10 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-blue-500 p-3 shadow-lg">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">新規登録</CardTitle>
          <CardDescription>新しいアカウントを作成してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>
                  {error.length === 1 ? (
                    error[0]
                  ) : (
                    <ul className="list-disc pl-4 space-y-1">
                      {error.map((msg, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: error messages can be identical
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">
                名前{' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="山田 太郎"
                autoComplete="name"
                autoFocus
                aria-required="true"
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
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
                autoComplete="new-password"
                aria-required="true"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                パスワード(確認){' '}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-required="true"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-md"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? '登録中...' : '登録'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              すでにアカウントをお持ちの方は{' '}
              <Link
                href="/login"
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

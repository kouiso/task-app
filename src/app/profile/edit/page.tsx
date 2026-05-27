'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { AppLayout } from '@/component/layout/app-layout';
import { Alert, AlertDescription, AlertTitle } from '@/component/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import { normalizeAvatarValue } from '@/lib/utils';
import { api } from '@/trpc/react';

const profileEditSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  avatar: z.string().url('有効なURLを入力してください').or(z.literal('')),
});
type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

export default function ProfileEditPage() {
  const router = useRouter();

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: '',
      email: '',
      avatar: '',
    },
  });

  const { data: currentUser, isLoading } = api.auth.getCurrentUser.useQuery();

  const utils = api.useUtils();

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await Promise.allSettled([
        utils.auth.getCurrentUser.invalidate(),
        utils.auth.getSession.invalidate(),
      ]);
      toast.success('プロフィールを更新しました');
      router.push('/profile');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? 'プロフィールの更新に失敗しました');
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        name: currentUser.name ?? '',
        email: currentUser.email ?? '',
        avatar: currentUser.avatar ?? '',
      });
    }
  }, [currentUser, form]);

  const handleSubmit = (values: ProfileEditFormValues) => {
    updateProfile.mutate({
      ...values,
      avatar: normalizeAvatarValue(values.avatar),
    });
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md mt-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール編集</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="flex justify-center mb-6">
                <Avatar className="w-24 h-24">
                  {form.watch('avatar') && <AvatarImage src={form.watch('avatar')} />}
                  <AvatarFallback className="text-2xl">
                    {form.watch('name')?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  名前{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </Label>
                <Input
                  id="name"
                  aria-required="true"
                  {...form.register('name')}
                  disabled={updateProfile.isPending}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
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
                  aria-required="true"
                  {...form.register('email')}
                  disabled={updateProfile.isPending}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">アバターURL（任意）</Label>
                <Input
                  id="avatar"
                  type="url"
                  {...form.register('avatar')}
                  disabled={updateProfile.isPending}
                  placeholder="https://example.com/avatar.png"
                />
                <p className="text-sm text-muted-foreground">画像のURLを入力してください</p>
              </div>

              {updateProfile.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>エラー</AlertTitle>
                  <AlertDescription>{updateProfile.error.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? '更新中...' : '更新'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/profile')}
                  disabled={updateProfile.isPending}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

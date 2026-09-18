'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft } from 'lucide-react';
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
import { Checkbox } from '@/component/ui/checkbox';
import { Input } from '@/component/ui/input';
import { Label } from '@/component/ui/label';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { isUserRole, USER_ROLE, USER_ROLE_LABELS } from '@/lib/constant/roles';
import { httpStatusOf, isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { normalizeAvatarValue } from '@/lib/utils';
import { api } from '@/trpc/react';

const shouldRetryUserQuery = (failureCount: number, error: unknown) =>
  httpStatusOf(error) !== 404 && shouldRetryQuery(failureCount, error);

const USER_ROLE_VALUES = ['USER', 'ADMIN'] as const;

const userEditSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  avatar: z.string().url('有効なURLを入力してください').or(z.literal('')),
  role: z.enum(USER_ROLE_VALUES),
  isActive: z.boolean(),
});
type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditClientProps {
  userId: string;
}

export function UserEditClient({ userId }: UserEditClientProps) {
  const router = useRouter();

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: '',
      avatar: '',
      role: USER_ROLE.USER,
      isActive: true,
    },
  });

  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isError: isCurrentUserError,
    isFetching: isCurrentUserFetching,
    error: currentUserError,
    refetch: refetchCurrentUser,
  } = api.auth.getCurrentUser.useQuery(undefined, { retry: shouldRetryQuery });
  const isAdmin = currentUser?.role === USER_ROLE.ADMIN;
  const isOwnProfile = currentUser?.id === userId;
  const canEditUser = isAdmin || isOwnProfile;
  const canManageAccount = isAdmin && !isOwnProfile;
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
    isFetching: isUserFetching,
    error: userError,
    refetch: refetchUser,
  } = api.user.getById.useQuery(
    { id: userId },
    {
      enabled: !!currentUser && canEditUser && userId.length > 0,
      retry: shouldRetryUserQuery,
    },
  );

  const utils = api.useUtils();

  const updateUser = api.user.update.useMutation({
    onSuccess: async () => {
      await Promise.allSettled([
        utils.user.getById.invalidate({ id: userId }),
        utils.user.getAll.invalidate(),
        utils.auth.getCurrentUser.invalidate(),
        utils.auth.getSession.invalidate(),
      ]);
      toast.success('ユーザー情報を更新しました');
      router.push(`/user/${userId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? 'ユーザー情報の更新に失敗しました');
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        avatar: user.avatar ?? '',
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [user, form]);

  const handleSubmit = (values: UserEditFormValues) => {
    updateUser.mutate({
      id: userId,
      name: values.name,
      avatar: normalizeAvatarValue(values.avatar),
      // 管理者でも本人編集時は role/isActive を送らない
      ...(canManageAccount ? { role: values.role, isActive: values.isActive } : {}),
    });
  };

  const queryErrors = [
    isCurrentUserError ? currentUserError : null,
    isUserError ? userError : null,
  ];
  const authFailed = queryErrors.some(isAuthError);
  const forbidden = queryErrors.some(isForbiddenError);
  const notFound = isUserError && httpStatusOf(userError) === 404;
  const hasFetchError = isCurrentUserError || isUserError;
  const hasRequiredData =
    (!isCurrentUserError || currentUser != null) && (!isUserError || user != null);
  const requiredLoading = isCurrentUserLoading || (canEditUser && isUserLoading);
  const requiredFetching = isCurrentUserFetching || isUserFetching;

  const refetchRequiredData = () => {
    void refetchCurrentUser();
    if (canEditUser) void refetchUser();
  };

  if (requiredLoading && !authFailed && !forbidden && !notFound) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  if (authFailed || forbidden || notFound || (hasFetchError && !hasRequiredData) || !currentUser) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">
            {authFailed
              ? 'ログインの有効期限が切れました'
              : forbidden
                ? 'このユーザーを編集する権限がありません'
                : notFound
                  ? 'ユーザーが見つかりません'
                  : 'ユーザー情報を取得できませんでした'}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            {authFailed
              ? 'もう一度ログインしてください。'
              : forbidden
                ? '管理者または本人のみ編集できます。'
                : notFound
                  ? '削除されたか、URLが正しくない可能性があります。'
                  : '通信状況を確認して、再読み込みしてください。'}
          </p>
          <Button
            type="button"
            onClick={() => {
              if (authFailed) {
                router.push('/login');
                return;
              }
              if (forbidden) {
                router.push('/dashboard');
                return;
              }
              if (notFound) {
                router.push(isAdmin ? '/user' : '/dashboard');
                return;
              }
              refetchRequiredData();
            }}
            disabled={requiredFetching}
          >
            {authFailed
              ? 'ログイン画面へ'
              : forbidden
                ? 'ダッシュボードへ'
                : notFound
                  ? isAdmin
                    ? 'ユーザー一覧へ'
                    : 'ダッシュボードへ'
                  : '再読み込み'}
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!canEditUser) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-md mt-8">
          <Card>
            <CardContent className="pt-6">
              <h1 className="text-xl font-bold mb-2">アクセス権限がありません</h1>
              <p className="text-muted-foreground">管理者または本人のみユーザー編集が可能です</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">
            ユーザー情報を取得できませんでした
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            通信状況を確認して、再読み込みしてください。
          </p>
          <Button onClick={refetchRequiredData} disabled={requiredFetching}>
            再読み込み
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md mt-8 mb-8">
        {hasFetchError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span>最新のユーザー情報を取得できませんでした。入力内容は保持されています。</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refetchRequiredData}
              disabled={requiredFetching}
            >
              再試行
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
          onClick={() => router.push(`/user/${userId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>ユーザー編集</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="flex justify-center mb-6">
                <Avatar className="w-24 h-24">
                  {form.watch('avatar') && <AvatarImage src={form.watch('avatar')} alt="" />}
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
                  disabled={updateUser.isPending}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" value={user.email} disabled />
                <p className="text-xs text-muted-foreground">メールアドレスは変更できません</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">アバターURL（任意）</Label>
                <Input
                  id="avatar"
                  type="url"
                  {...form.register('avatar')}
                  disabled={updateUser.isPending}
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              {canManageAccount && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role">ロール</Label>
                    <Select
                      value={form.watch('role')}
                      onValueChange={(value) => {
                        if (isUserRole(value)) {
                          form.setValue('role', value);
                        }
                      }}
                      disabled={updateUser.isPending}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="ロールを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={form.watch('isActive')}
                      onCheckedChange={(checked) => form.setValue('isActive', checked === true)}
                      disabled={updateUser.isPending}
                    />
                    <Label htmlFor="isActive">アクティブ</Label>
                  </div>
                </>
              )}

              {updateUser.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>エラー</AlertTitle>
                  <AlertDescription>{updateUser.error.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="w-full" disabled={updateUser.isPending}>
                  {updateUser.isPending ? '更新中...' : '更新'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/user/${userId}`)}
                  disabled={updateUser.isPending}
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

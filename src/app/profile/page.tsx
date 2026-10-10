'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Edit, Lock, Mail, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import { Separator } from '@/component/ui/separator';
import { ActiveStatusBadge, UserRoleBadge } from '@/component/ui/user-badges';
import { USER_ROLE } from '@/lib/constant/roles';
import { isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { api } from '@/trpc/react';

export default function ProfilePage() {
  const router = useRouter();
  const {
    data: currentUser,
    isLoading,
    isError,
    isFetching,
    error,
    refetch,
  } = api.auth.getCurrentUser.useQuery(undefined, {
    retry: shouldRetryQuery,
  });
  const authFailed = isError && isAuthError(error);
  const forbidden = isError && isForbiddenError(error);
  const profileRefreshFailed = isError && !authFailed && !forbidden;

  useEffect(() => {
    if (!isLoading && (authFailed || (!isError && !currentUser))) {
      router.push('/login');
    }
  }, [authFailed, currentUser, isError, isLoading, router]);

  if (isLoading && !authFailed && !forbidden) {
    return <PageLoadingSpinner />;
  }

  if (forbidden) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <p className="font-semibold">プロフィールを表示する権限がありません</p>
          <p className="text-sm text-muted-foreground">管理者に確認してください。</p>
        </div>
      </AppLayout>
    );
  }

  if (profileRefreshFailed && !currentUser) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <p className="font-semibold">プロフィールを取得できませんでした</p>
          <p className="mb-6 text-sm text-muted-foreground">
            通信状況を確認して、再読み込みしてください。
          </p>
          <Button type="button" onClick={() => void refetch()} disabled={isFetching}>
            再読み込み
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl space-y-6 py-8">
        {profileRefreshFailed ? (
          <div
            role="alert"
            className="rounded-lg border
    border-amber-300/60 bg-amber-50 px-4 py-3 text-sm
    text-amber-900"
          >
            <p>最新のプロフィールを取得できませんでした。 表示は前回取得時の内容です。</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              再試行
            </Button>
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Avatar className="w-20 h-20 rounded-lg">
                {currentUser.avatar && (
                  <AvatarImage src={currentUser.avatar} className="object-cover" alt="" />
                )}
                <AvatarFallback className="rounded-lg bg-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold break-words">
                  {currentUser.name || currentUser.email}
                </h1>
                <div className="flex gap-2 mt-2">
                  {currentUser.role === USER_ROLE.ADMIN && (
                    <UserRoleBadge role={currentUser.role} />
                  )}
                  <ActiveStatusBadge isActive={currentUser.isActive} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">メールアドレス</p>
                  <p className="text-base">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">登録日</p>
                  <p className="text-base">
                    {currentUser.createdAt
                      ? format(new Date(currentUser.createdAt), 'yyyy年MM月dd日', {
                          locale: ja,
                        })
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">最終更新日</p>
                  <p className="text-base">
                    {currentUser.updatedAt
                      ? format(new Date(currentUser.updatedAt), 'yyyy年MM月dd日', {
                          locale: ja,
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={() => router.push('/profile/edit')}>
                <Edit className="w-4 h-4 mr-2" />
                プロフィール編集
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/profile/change-password')}
              >
                <Lock className="w-4 h-4 mr-2" />
                パスワード変更
              </Button>
              {currentUser.role === USER_ROLE.ADMIN && (
                <Button variant="outline" className="w-full" onClick={() => router.push('/user')}>
                  <Shield className="w-4 h-4 mr-2" />
                  ユーザー管理
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

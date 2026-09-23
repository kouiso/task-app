'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Eye, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Button } from '@/component/ui/button';
import { Card, CardContent } from '@/component/ui/card';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/component/ui/table';
import { ActiveStatusBadge, UserRoleBadge } from '@/component/ui/user-badges';
import { USER_ROLE } from '@/lib/constant/roles';
import { isAuthError, isForbiddenError, shouldRetryQuery } from '@/lib/query-error';
import { api } from '@/trpc/react';

export default function UsersPage() {
  const router = useRouter();

  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isError: isCurrentUserError,
    isFetching: isCurrentUserFetching,
    error: currentUserError,
    refetch: refetchCurrentUser,
  } = api.auth.getCurrentUser.useQuery(undefined, { retry: shouldRetryQuery });
  const isAdmin = currentUser?.role === USER_ROLE.ADMIN;

  const {
    data: users,
    isLoading: isUsersLoading,
    isError: isUsersError,
    isFetching: isUsersFetching,
    error: usersError,
    refetch: refetchUsers,
  } = api.user.getAll.useQuery(undefined, {
    enabled: isAdmin,
    retry: shouldRetryQuery,
  });

  const queryErrors = [
    isCurrentUserError ? currentUserError : null,
    isUsersError ? usersError : null,
  ];
  const authFailed = queryErrors.some(isAuthError);
  const forbidden = queryErrors.some(isForbiddenError);
  const hasFetchError = isCurrentUserError || isUsersError;
  const hasRequiredData =
    (!isCurrentUserError || currentUser != null) && (!isUsersError || users != null);
  const requiredLoading = isCurrentUserLoading || (isAdmin && isUsersLoading);
  const requiredFetching = isCurrentUserFetching || isUsersFetching;

  const refetchRequiredData = () => {
    void refetchCurrentUser();
    if (isAdmin) void refetchUsers();
  };

  if (requiredLoading && !authFailed && !forbidden) {
    return (
      <AppLayout>
        <PageLoadingSpinner />
      </AppLayout>
    );
  }

  if (hasFetchError && !hasRequiredData && !authFailed && !forbidden) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="mb-2 text-base font-semibold text-foreground">
            ユーザー一覧を取得できませんでした
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

  if (authFailed || forbidden || !isAdmin) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-6xl mt-8">
          <Card>
            <CardContent className="pt-6">
              <h1 className="text-2xl font-bold mb-2">
                {authFailed ? 'ログインの有効期限が切れました' : 'アクセス権限がありません'}
              </h1>
              <p className="text-muted-foreground mb-4">
                {authFailed ? 'もう一度ログインしてください。' : 'この機能は管理者のみ利用できます'}
              </p>
              {authFailed && <Button onClick={() => router.push('/login')}>ログイン画面へ</Button>}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl py-8">
        {hasFetchError && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <span>最新のユーザー一覧を取得できませんでした。前回取得時の内容です。</span>
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">ユーザー管理</h1>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {user.avatar && <AvatarImage src={user.avatar} alt={user.name || ''} />}
                          <AvatarFallback>{user.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <ActiveStatusBadge isActive={user.isActive} />
                    </TableCell>
                    <TableCell>
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'yyyy/MM/dd', {
                            locale: ja,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/user/${user.id}`)}
                          aria-label="詳細"
                          title="詳細"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/user/${user.id}/edit`)}
                          aria-label="編集"
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {users && users.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            ユーザーが見つかりませんでした
          </div>
        )}
      </div>
    </AppLayout>
  );
}

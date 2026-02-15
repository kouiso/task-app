'use client';

import { AppLayout } from '@/component/layout/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Separator } from '@/component/ui/separator';
import { api } from '@/trpc/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Edit, Lock, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = api.auth.getCurrentUser.useQuery();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-2xl mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!currentUser) {
    router.push('/login');
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Header */}
            <div className="flex gap-4">
              <Avatar className="w-20 h-20 rounded-lg">
                <AvatarImage src={currentUser.avatar || ''} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-primary/10">
                  <User className="w-10 h-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{currentUser.name}</h1>
                <div className="flex gap-2 mt-2">
                  {currentUser.role === 'ADMIN' && (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      管理者
                    </Badge>
                  )}
                  {currentUser.isActive ? (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-green-500/10 text-green-700 border-green-200"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      アクティブ
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-gray-500/10 text-gray-700 border-gray-200"
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-500" />
                      無効
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Profile Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">メールアドレス</p>
                  <p className="text-base">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
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
                  <User className="w-5 h-5 text-primary" />
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

            {/* Actions */}
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
              {currentUser.role === 'ADMIN' && (
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

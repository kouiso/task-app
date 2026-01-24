'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent } from '@/component/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/component/ui/table';
import { api } from '@/trpc/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Eye, Pencil, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const router = useRouter();

  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  const { data: users, isLoading, error } = api.user.getAll.useQuery();

  if (error) {
    toast.error(error.message || 'ユーザー一覧の取得に失敗しました');
    if (error.message.includes('管理者権限')) {
      router.push('/dashboard');
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl mt-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto max-w-6xl mt-8">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-2">アクセス権限がありません</h1>
            <p className="text-muted-foreground">この機能は管理者のみ利用できます</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
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
                        <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                        <AvatarFallback>{user.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role === 'ADMIN' ? (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" /> 管理者
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" /> ユーザー
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-700 border-green-200"
                      >
                        アクティブ
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-500/10 text-gray-700 border-gray-200"
                      >
                        無効
                      </Badge>
                    )}
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
                        onClick={() => router.push(`/users/${user.id}`)}
                        title="詳細"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/users/${user.id}/edit`)}
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
  );
}

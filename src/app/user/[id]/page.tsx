'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { Separator } from '@/component/ui/separator';
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
import { ArrowLeft, Calendar, Mail, Pencil, Shield, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params['id'] as string;

  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  const {
    data: user,
    isLoading,
    error,
  } = api.user.getById.useQuery({
    id: userId,
  });

  if (error) {
    toast.error(error.message || 'ユーザー情報の取得に失敗しました');
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl mt-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-6xl mt-8">
        <Card>
          <CardContent className="pt-6">
            <p>ユーザーが見つかりません</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOwnProfile = currentUser?.id === user.id;

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <Button
        variant="ghost"
        className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
        onClick={() => router.push('/users')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        ユーザー一覧に戻る
      </Button>

      <div className="grid gap-6 md:grid-cols-12">
        {/* User Info Card */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={user.avatar || ''} alt={user.name || ''} />
                  <AvatarFallback className="text-3xl">
                    {user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold mb-2">{user.name}</h2>
                <div className="flex justify-center gap-2 mb-4">
                  {user.role === 'ADMIN' ? (
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" /> 管理者
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3" /> ユーザー
                    </Badge>
                  )}
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
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-muted-foreground text-xs">メールアドレス</p>
                    <p>{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-muted-foreground text-xs">登録日</p>
                    <p>
                      {user.createdAt
                        ? format(new Date(user.createdAt), 'yyyy年MM月dd日', {
                            locale: ja,
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-muted-foreground text-xs">最終更新日</p>
                    <p>
                      {user.updatedAt
                        ? format(new Date(user.updatedAt), 'yyyy年MM月dd日', {
                            locale: ja,
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {(isAdmin || isOwnProfile) && (
                <>
                  <Separator className="my-4" />
                  <Button className="w-full" onClick={() => router.push(`/users/${user.id}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" /> 編集
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Projects and Tasks */}
        <div className="md:col-span-8 space-y-6">
          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">参加プロジェクト</CardTitle>
            </CardHeader>
            <CardContent>
              {user.projects && user.projects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.projects.map((member) => (
                    <Badge
                      key={member.id}
                      className="cursor-pointer hover:opacity-80 px-3 py-1 text-sm font-normal text-white"
                      style={{ backgroundColor: member.project.color }}
                      onClick={() => router.push(`/project?projectId=${member.project.id}`)}
                    >
                      {member.project.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  参加しているプロジェクトはありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">担当中のタスク</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {user.assignedTasks && user.assignedTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>優先度</TableHead>
                      <TableHead>期限</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.assignedTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/task?taskId=${task.id}`)}
                      >
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate
                            ? format(new Date(task.dueDate), 'yyyy/MM/dd', {
                                locale: ja,
                              })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-muted-foreground text-sm">担当中のタスクはありません</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

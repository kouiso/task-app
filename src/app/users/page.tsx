'use client';

import { api } from '@/trpc/react';
import {
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const router = useRouter();

  // 現在のユーザー情報を取得
  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  // ユーザー一覧を取得
  const { data: users, isLoading, error } = api.user.getAll.useQuery();

  // エラーハンドリング
  if (error) {
    toast.error(error.message || 'ユーザー一覧の取得に失敗しました');
    if (error.message.includes('管理者権限')) {
      router.push('/dashboard');
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  // 管理者権限チェック
  if (currentUser?.role !== 'ADMIN') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              アクセス権限がありません
            </Typography>
            <Typography color="text.secondary">この機能は管理者のみ利用できます</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          ユーザー管理
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザー</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>ロール</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>登録日</TableCell>
              <TableCell align="center">アクション</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      {...(user.avatar && { src: user.avatar })}
                      alt={user.name || ''}
                      sx={{ width: 40, height: 40 }}
                    >
                      {user.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography>{user.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    icon={user.role === 'ADMIN' ? <AdminIcon /> : <PersonIcon />}
                    label={user.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                    color={user.role === 'ADMIN' ? 'secondary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'アクティブ' : '無効'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.createdAt
                    ? format(new Date(user.createdAt), 'yyyy/MM/dd', {
                        locale: ja,
                      })
                    : '-'}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/users/${user.id}`)}
                    title="詳細"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/users/${user.id}/edit`)}
                    title="編集"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {users && users.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="text.secondary">ユーザーが見つかりませんでした</Typography>
        </Box>
      )}
    </Container>
  );
}

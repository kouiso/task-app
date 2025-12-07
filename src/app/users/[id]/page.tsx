'use client';

import { api } from '@/trpc/react';
import {
  AdminPanelSettings as AdminIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
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
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params['id'] as string;

  // 現在のユーザー情報を取得
  const { data: currentUser } = api.auth.getCurrentUser.useQuery();

  // ユーザー詳細を取得
  const {
    data: user,
    isLoading,
    error,
  } = api.user.getById.useQuery({
    id: userId,
  });

  // エラーハンドリング
  if (error) {
    toast.error(error.message || 'ユーザー情報の取得に失敗しました');
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography>ユーザーが見つかりません</Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOwnProfile = currentUser?.id === user.id;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 戻るボタン */}
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/users')} sx={{ mb: 2 }}>
        ユーザー一覧に戻る
      </Button>

      <Grid container spacing={3}>
        {/* ユーザー情報カード */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              {/* プロフィール */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar
                  {...(user.avatar && { src: user.avatar })}
                  alt={user.name || ''}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                >
                  {user.name?.[0]?.toUpperCase()}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {user.name}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    icon={user.role === 'ADMIN' ? <AdminIcon /> : <PersonIcon />}
                    label={user.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                    color={user.role === 'ADMIN' ? 'secondary' : 'default'}
                    size="small"
                  />
                  <Chip
                    label={user.isActive ? 'アクティブ' : '無効'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 詳細情報 */}
              <List dense>
                <ListItem>
                  <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="メールアドレス" secondary={user.email} />
                </ListItem>
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="登録日"
                    secondary={
                      user.createdAt
                        ? format(new Date(user.createdAt), 'yyyy年MM月dd日', {
                            locale: ja,
                          })
                        : '-'
                    }
                  />
                </ListItem>
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="最終更新日"
                    secondary={
                      user.updatedAt
                        ? format(new Date(user.updatedAt), 'yyyy年MM月dd日', {
                            locale: ja,
                          })
                        : '-'
                    }
                  />
                </ListItem>
              </List>

              {/* 編集ボタン */}
              {(isAdmin || isOwnProfile) && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => router.push(`/users/${user.id}/edit`)}
                  >
                    編集
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* プロジェクトとタスク */}
        <Grid item xs={12} md={8}>
          {/* 参加プロジェクト */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                参加プロジェクト
              </Typography>
              {user.projects && user.projects.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {user.projects.map((member) => (
                    <Chip
                      key={member.id}
                      label={member.project.name}
                      onClick={() => router.push(`/project/${member.project.id}`)}
                      sx={{
                        bgcolor: member.project.color,
                        color: 'white',
                        '&:hover': {
                          bgcolor: member.project.color,
                          opacity: 0.8,
                        },
                      }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">参加しているプロジェクトはありません</Typography>
              )}
            </CardContent>
          </Card>

          {/* 担当タスク */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                担当中のタスク
              </Typography>
              {user.assignedTasks && user.assignedTasks.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>タイトル</TableCell>
                        <TableCell>ステータス</TableCell>
                        <TableCell>優先度</TableCell>
                        <TableCell>期限</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {user.assignedTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/task/${task.id}`)}
                        >
                          <TableCell>{task.title}</TableCell>
                          <TableCell>
                            <Chip
                              label={task.status}
                              size="small"
                              color={
                                task.status === 'DONE'
                                  ? 'success'
                                  : task.status === 'IN_PROGRESS'
                                    ? 'primary'
                                    : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority}
                              size="small"
                              color={
                                task.priority === 'URGENT'
                                  ? 'error'
                                  : task.priority === 'HIGH'
                                    ? 'warning'
                                    : 'default'
                              }
                            />
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
                </TableContainer>
              ) : (
                <Typography color="text.secondary">担当中のタスクはありません</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

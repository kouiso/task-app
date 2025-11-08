'use client';

import { api } from '@/trpc/react';
import {
  AdminPanelSettings as AdminIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Lock as LockIcon,
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
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = api.auth.getCurrentUser.useQuery();

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!currentUser) {
    router.push('/login');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardContent>
          {/* ヘッダー部分 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={currentUser.avatar || undefined}
              alt={currentUser.name || ''}
              sx={{ width: 80, height: 80, mr: 3 }}
            >
              {currentUser.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" component="h1" gutterBottom>
                {currentUser.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  icon={currentUser.role === 'ADMIN' ? <AdminIcon /> : <PersonIcon />}
                  label={currentUser.role === 'ADMIN' ? '管理者' : 'ユーザー'}
                  color={currentUser.role === 'ADMIN' ? 'secondary' : 'default'}
                  size="small"
                />
                <Chip
                  label={currentUser.isActive ? 'アクティブ' : '無効'}
                  color={currentUser.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* プロフィール情報 */}
          <List>
            <ListItem>
              <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText primary="メールアドレス" secondary={currentUser.email} />
            </ListItem>
            <ListItem>
              <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText
                primary="登録日"
                secondary={
                  currentUser.createdAt
                    ? format(new Date(currentUser.createdAt), 'yyyy年MM月dd日', {
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
                  currentUser.updatedAt
                    ? format(new Date(currentUser.updatedAt), 'yyyy年MM月dd日', {
                        locale: ja,
                      })
                    : '-'
                }
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          {/* アクションボタン */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => router.push('/profile/edit')}
              >
                プロフィール編集
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => router.push('/profile/change-password')}
              >
                パスワード変更
              </Button>
            </Grid>
            {currentUser.role === 'ADMIN' && (
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<AdminIcon />}
                  onClick={() => router.push('/users')}
                >
                  ユーザー管理
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}

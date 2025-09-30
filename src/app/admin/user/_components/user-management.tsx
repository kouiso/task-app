'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  Delete,
  AdminPanelSettings,
  Person,
  Block,
  CheckCircle,
  Add,
  Save,
  Cancel,
} from '@mui/icons-material';
import { UserRole } from '@prisma/client';
import { api } from '@/lib/trpc/client';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface UserManagementProps {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role?: UserRole;
    isActive?: boolean;
    createdAt?: Date;
  }>;
  currentUserId: string;
}

export function UserManagement({ users: initialUsers, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: typeof initialUsers[0] | null;
  }>({ open: false, user: null });

  const updateUserRole = api.user.updateUserRole.useMutation({
    onSuccess: (updatedUser) => {
      setUsers(users.map(u => 
        u.id === updatedUser.id ? { ...u, role: updatedUser.role } : u
      ));
      handleCloseEditDialog();
    },
  });

  const toggleUserStatus = api.user.toggleUserStatus.useMutation({
    onSuccess: (updatedUser) => {
      setUsers(users.map(u => 
        u.id === updatedUser.id ? { ...u, isActive: updatedUser.isActive } : u
      ));
    },
  });

  const handleEditUser = (user: typeof initialUsers[0]) => {
    setEditDialog({ open: true, user });
  };

  const handleCloseEditDialog = () => {
    setEditDialog({ open: false, user: null });
  };

  const handleSaveUser = () => {
    if (!editDialog.user) return;
    
    updateUserRole.mutate({
      userId: editDialog.user.id,
      role: editDialog.user.role || UserRole.USER,
    });
  };

  const handleToggleUserStatus = async (userId: string) => {
    await toggleUserStatus.mutateAsync({ userId });
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      default:
        return 'primary';
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <AdminPanelSettings fontSize="small" />;
      default:
        return <Person fontSize="small" />;
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            ユーザー管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            システムユーザーの権限とステータスを管理
          </Typography>
        </Box>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ユーザー</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>役割</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>登録日</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user.id}
                sx={{ 
                  opacity: user.isActive === false ? 0.6 : 1,
                }}
              >
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.name || 'ー'}
                      </Typography>
                      {user.id === currentUserId && (
                        <Typography variant="caption" color="text.secondary">
                          (自分)
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    icon={getRoleIcon(user.role)}
                    label={user.role === UserRole.ADMIN ? '管理者' : 'ユーザー'}
                    size="small"
                    color={getRoleColor(user.role)}
                    variant={user.role === UserRole.ADMIN ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  {user.isActive === false ? (
                    <Chip
                      icon={<Block />}
                      label="無効"
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      icon={<CheckCircle />}
                      label="有効"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.createdAt
                      ? formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                          locale: ja,
                        })
                      : 'ー'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="編集">
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        disabled={user.id === currentUserId}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.isActive ? '無効化' : '有効化'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleUserStatus(user.id)}
                        disabled={user.id === currentUserId}
                        color={user.isActive === false ? 'success' : 'error'}
                      >
                        {user.isActive === false ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialog.open} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          ユーザー編集
        </DialogTitle>
        <DialogContent>
          {editDialog.user && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="名前"
                value={editDialog.user.name || ''}
                disabled
                fullWidth
              />
              <TextField
                label="メールアドレス"
                value={editDialog.user.email}
                disabled
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>役割</InputLabel>
                <Select
                  value={editDialog.user.role || UserRole.USER}
                  label="役割"
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    user: { ...editDialog.user!, role: e.target.value as UserRole }
                  })}
                >
                  <MenuItem value={UserRole.USER}>ユーザー</MenuItem>
                  <MenuItem value={UserRole.ADMIN}>管理者</MenuItem>
                </Select>
              </FormControl>

              {editDialog.user.role === UserRole.ADMIN && (
                <Alert severity="warning">
                  管理者権限を付与すると、このユーザーはすべてのプロジェクトとユーザーを管理できるようになります。
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} startIcon={<Cancel />}>
            キャンセル
          </Button>
          <Button
            onClick={handleSaveUser}
            variant="contained"
            startIcon={<Save />}
            disabled={updateUserRole.isPending}
          >
            {updateUserRole.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Cancel,
} from '@mui/icons-material';
import { TaskPriority } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/trpc/client';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ja from 'date-fns/locale/ja';

interface TaskFormProps {
  projects: Array<{ id: string; name: string; color: string }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  currentUserId: string;
}

export function TaskForm({ projects, users, currentUserId }: TaskFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: '',
    priority: TaskPriority.MEDIUM,
    estimatedHours: '',
    dueDate: null as Date | null,
    assigneeId: currentUserId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTask = api.task.create.useMutation({
    onSuccess: (task) => {
      router.push(`/task/${task.id}`);
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    if (!formData.projectId) {
      newErrors.projectId = 'プロジェクトを選択してください';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    createTask.mutate({
      title: formData.title,
      description: formData.description || undefined,
      projectId: formData.projectId,
      priority: formData.priority,
      estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : undefined,
      dueDate: formData.dueDate || undefined,
      assigneeId: formData.assigneeId || undefined,
    });
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          新規タスク作成
        </Typography>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {errors.submit && (
              <Alert severity="error">{errors.submit}</Alert>
            )}
            
            <TextField
              label="タイトル"
              required
              fullWidth
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setErrors({ ...errors, title: '' });
              }}
              error={!!errors.title}
              helperText={errors.title}
              autoFocus
            />
            
            <TextField
              label="説明"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth required error={!!errors.projectId}>
                <InputLabel>プロジェクト</InputLabel>
                <Select
                  value={formData.projectId}
                  label="プロジェクト"
                  onChange={(e) => {
                    setFormData({ ...formData, projectId: e.target.value });
                    setErrors({ ...errors, projectId: '' });
                  }}
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: project.color,
                            mr: 1,
                          }}
                        />
                        {project.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={formData.priority}
                  label="優先度"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                >
                  <MenuItem value={TaskPriority.LOW}>低</MenuItem>
                  <MenuItem value={TaskPriority.MEDIUM}>中</MenuItem>
                  <MenuItem value={TaskPriority.HIGH}>高</MenuItem>
                  <MenuItem value={TaskPriority.URGENT}>緊急</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>担当者</InputLabel>
                <Select
                  value={formData.assigneeId}
                  label="担当者"
                  onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="見積時間（時間）"
                type="number"
                fullWidth
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                inputProps={{ min: 0, step: 0.5 }}
              />
            </Stack>
            
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
              <DatePicker
                label="期限"
                value={formData.dueDate}
                onChange={(date) => setFormData({ ...formData, dueDate })}
                slotProps={{
                  textField: { fullWidth: true },
                }}
              />
            </LocalizationProvider>
            
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => router.back()}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={createTask.isPending}
              >
                {createTask.isPending ? '作成中...' : '作成'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
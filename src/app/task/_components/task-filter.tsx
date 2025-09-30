'use client';

import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Chip,
  InputAdornment,
  IconButton,
  Collapse,
  Typography,
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ja from 'date-fns/locale/ja';

interface TaskFilterProps {
  filters: {
    search?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    projectId?: string;
    assigneeId?: string;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  };
  onFiltersChange: (filters: any) => void;
  projects?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; name: string | null; email: string }>;
}

export function TaskFilter({ filters, onFiltersChange, projects = [], users = [] }: TaskFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (value === '') {
      onFiltersChange({ ...filters, search: undefined });
    }
  };

  const handleSearchSubmit = () => {
    onFiltersChange({ ...filters, search: localSearch || undefined });
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    onFiltersChange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined).length;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="タスクを検索..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: localSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => handleSearchChange('')}>
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSearchSubmit}
            startIcon={<Search />}
          >
            検索
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowAdvanced(!showAdvanced)}
            startIcon={<FilterList />}
            endIcon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
          >
            詳細フィルター
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20, minWidth: 20 }}
              />
            )}
          </Button>
        </Stack>

        <Collapse in={showAdvanced}>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>ステータス</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="ステータス"
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    status: e.target.value || undefined,
                  })}
                >
                  <MenuItem value="">
                    <em>すべて</em>
                  </MenuItem>
                  <MenuItem value={TaskStatus.TODO}>TODO</MenuItem>
                  <MenuItem value={TaskStatus.IN_PROGRESS}>進行中</MenuItem>
                  <MenuItem value={TaskStatus.DONE}>完了</MenuItem>
                  <MenuItem value={TaskStatus.CANCELLED}>キャンセル</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>優先度</InputLabel>
                <Select
                  value={filters.priority || ''}
                  label="優先度"
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priority: e.target.value || undefined,
                  })}
                >
                  <MenuItem value="">
                    <em>すべて</em>
                  </MenuItem>
                  <MenuItem value={TaskPriority.LOW}>低</MenuItem>
                  <MenuItem value={TaskPriority.MEDIUM}>中</MenuItem>
                  <MenuItem value={TaskPriority.HIGH}>高</MenuItem>
                  <MenuItem value={TaskPriority.URGENT}>緊急</MenuItem>
                </Select>
              </FormControl>

              {projects.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>プロジェクト</InputLabel>
                  <Select
                    value={filters.projectId || ''}
                    label="プロジェクト"
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      projectId: e.target.value || undefined,
                    })}
                  >
                    <MenuItem value="">
                      <em>すべて</em>
                    </MenuItem>
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {users.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>担当者</InputLabel>
                  <Select
                    value={filters.assigneeId || ''}
                    label="担当者"
                    onChange={(e) => onFiltersChange({
                      ...filters,
                      assigneeId: e.target.value || undefined,
                    })}
                  >
                    <MenuItem value="">
                      <em>すべて</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <DatePicker
                  label="期限（開始）"
                  value={filters.dueDateFrom || null}
                  onChange={(date) => onFiltersChange({
                    ...filters,
                    dueDateFrom: date || undefined,
                  })}
                  slotProps={{
                    textField: { size: 'small', sx: { minWidth: 200 } },
                  }}
                />
                <DatePicker
                  label="期限（終了）"
                  value={filters.dueDateTo || null}
                  onChange={(date) => onFiltersChange({
                    ...filters,
                    dueDateTo: date || undefined,
                  })}
                  slotProps={{
                    textField: { size: 'small', sx: { minWidth: 200 } },
                  }}
                />
              </Stack>
            </LocalizationProvider>

            {activeFilterCount > 0 && (
              <Box>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={handleClearFilters}
                  startIcon={<Clear />}
                >
                  すべてのフィルターをクリア
                </Button>
              </Box>
            )}
          </Stack>
        </Collapse>

        {activeFilterCount > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              適用中:
            </Typography>
            {filters.search && (
              <Chip
                label={`検索: ${filters.search}`}
                size="small"
                onDelete={() => {
                  setLocalSearch('');
                  onFiltersChange({ ...filters, search: undefined });
                }}
              />
            )}
            {filters.status && (
              <Chip
                label={`ステータス: ${filters.status}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, status: undefined })}
              />
            )}
            {filters.priority && (
              <Chip
                label={`優先度: ${filters.priority}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, priority: undefined })}
              />
            )}
            {filters.projectId && projects.length > 0 && (
              <Chip
                label={`プロジェクト: ${projects.find(p => p.id === filters.projectId)?.name}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, projectId: undefined })}
              />
            )}
            {filters.assigneeId && users.length > 0 && (
              <Chip
                label={`担当者: ${users.find(u => u.id === filters.assigneeId)?.name || users.find(u => u.id === filters.assigneeId)?.email}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, assigneeId: undefined })}
              />
            )}
            {filters.dueDateFrom && (
              <Chip
                label={`期限開始: ${filters.dueDateFrom.toLocaleDateString('ja-JP')}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, dueDateFrom: undefined })}
              />
            )}
            {filters.dueDateTo && (
              <Chip
                label={`期限終了: ${filters.dueDateTo.toLocaleDateString('ja-JP')}`}
                size="small"
                onDelete={() => onFiltersChange({ ...filters, dueDateTo: undefined })}
              />
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
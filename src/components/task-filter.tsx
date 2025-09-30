'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Collapse,
  Typography,
  Grid,
  Button,
} from '@mui/material';
import {
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TASK_STATUS_VALUES } from '@/lib/constants/status';
import { TASK_PRIORITY_VALUES } from '@/lib/constants/priority';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { api, type RouterInputs } from '@/lib/trpc/client';

interface TaskFiltersProps {
  onFiltersChange: (filters: RouterInputs['task']['getAll']) => void;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({ onFiltersChange }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const [filters, setFilters] = useState<RouterInputs['task']['getAll']>({
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') as any || undefined,
    priority: searchParams.get('priority') as any || undefined,
    assigneeId: searchParams.get('assigneeId') || undefined,
    projectId: searchParams.get('projectId') || undefined,
    dueDateFrom: searchParams.get('dueDateFrom') ? new Date(searchParams.get('dueDateFrom')!) : undefined,
    dueDateTo: searchParams.get('dueDateTo') ? new Date(searchParams.get('dueDateTo')!) : undefined,
    limit: 50,
    offset: 0,
  });  // 検索文字列のデバウンス処理
  const debouncedSearch = useDebounce(filters.search, 500);

  // フィルター変更を親コンポーネントに通知
  const notifyFiltersChange = useCallback(() => {
    onFiltersChange(filters);

    // URLパラメータを更新
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'limit' && key !== 'offset') {
        if (value instanceof Date) {
          params.set(key, value.toISOString().split('T')[0]);
        } else {
          params.set(key, String(value));
        }
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [filters, onFiltersChange, router]);  // デバウンスされた検索文字列が変更されたら通知
  useEffect(() => {
    notifyFiltersChange();
  }, [debouncedSearch, notifyFiltersChange]);

  // 検索以外のフィルターが変更されたら即座に通知
  useEffect(() => {
    const { search, ...filtersWithoutSearch } = filters;
    notifyFiltersChange();
  }, [
    filters.status,
    filters.priority,
    filters.assigneeId,
    filters.projectId,
    filters.dueDateFrom,
    filters.dueDateTo,
  ]);

  const handleFilterChange = (key: keyof RouterInputs['task']['getAll'], value: string | Date | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    const clearedFilters: RouterInputs['task']['getAll'] = {
      search: undefined,
      status: undefined,
      priority: undefined,
      assigneeId: undefined,
      projectId: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      limit: 50,
      offset: 0,
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    router.replace(window.location.pathname, { scroll: false });
  };

  const hasActiveFilters = Object.values(filters).some(value =>
    value !== undefined && value !== null && value !== 50 && value !== 0
  );
  const activeFilterCount = Object.entries(filters).filter(([key, value]) =>
    value !== undefined && value !== null && key !== 'limit' && key !== 'offset'
  ).length;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* 検索バー */}
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <TextField
            fullWidth
            placeholder="タスクを検索..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            size="small"
          />

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ minWidth: 140 }}
          >
            フィルター
            {activeFilterCount > 0 && (
              <Chip
                label={activeFilterCount}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
              />
            )}
          </Button>

          {hasActiveFilters && (
            <IconButton onClick={clearAllFilters} title="フィルターをクリア">
              <Clear />
            </IconButton>
          )}
        </Box>

        {/* 詳細フィルター */}
        <Collapse in={isExpanded}>
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              {/* ステータス */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={filters.status}
                    label="ステータス"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>すべて</em>
                    </MenuItem>
                    {TASK_STATUS_VALUES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 優先度 */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={filters.priority}
                    label="優先度"
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>すべて</em>
                    </MenuItem>
                    {TASK_PRIORITY_VALUES.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* 期限From */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="期限（開始）"
                  type="date"
                  value={filters.dueDateFrom}
                  onChange={(e) => handleFilterChange('dueDateFrom', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>

              {/* 期限To */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="期限（終了）"
                  type="date"
                  value={filters.dueDateTo}
                  onChange={(e) => handleFilterChange('dueDateTo', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
            </Grid>

            {/* アクティブフィルター表示 */}
            {hasActiveFilters && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  アクティブなフィルター:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {filters.status && (
                    <Chip
                      label={`ステータス: ${TASK_STATUS_VALUES.find(s => s.value === filters.status)?.label}`}
                      onDelete={() => handleFilterChange('status', '')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {filters.priority && (
                    <Chip
                      label={`優先度: ${TASK_PRIORITY_VALUES.find(p => p.value === filters.priority)?.label}`}
                      onDelete={() => handleFilterChange('priority', '')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {filters.dueDateFrom && (
                    <Chip
                      label={`期限開始: ${filters.dueDateFrom}`}
                      onDelete={() => handleFilterChange('dueDateFrom', '')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {filters.dueDateTo && (
                    <Chip
                      label={`期限終了: ${filters.dueDateTo}`}
                      onDelete={() => handleFilterChange('dueDateTo', '')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default TaskFilters;

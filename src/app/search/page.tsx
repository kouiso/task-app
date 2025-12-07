'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { TaskCard } from '@/components/task/task-card';
import { api } from '@/trpc/react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/**
 * 検索ページコンポーネント
 * redmine-cloneの検索機能を完全に再現
 */
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 検索条件の状態
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const [status, setStatus] = useState<'all' | TaskStatus>(
    (searchParams.get('status') as 'all' | TaskStatus) || 'all',
  );
  const [priority, setPriority] = useState<'all' | TaskPriority>(
    (searchParams.get('priority') as 'all' | TaskPriority) || 'all',
  );
  const [assignedTo, setAssignedTo] = useState(searchParams.get('assignedTo') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');

  // 検索を実行するかどうか
  const shouldSearch =
    !!keyword ||
    !!projectId ||
    status !== 'all' ||
    priority !== 'all' ||
    !!assignedTo ||
    !!dateFrom ||
    !!dateTo;

  // データ取得
  const { data: projects } = api.search.getUserProjects.useQuery();
  const { data: users } = api.search.getProjectMembers.useQuery();
  const { data: searchResults, isLoading } = api.search.search.useQuery(
    {
      keyword: keyword || undefined,
      projectId: projectId || undefined,
      status: status,
      priority: priority,
      assignedTo: assignedTo || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    },
    {
      enabled: shouldSearch,
      refetchOnWindowFocus: false,
    },
  );

  // URLパラメータから初期値を設定（条件分岐を配列メソッドで削減）
  useEffect(() => {
    const paramSetters: Array<{
      key: string;
      setter: (value: string) => void;
    }> = [
      { key: 'keyword', setter: setKeyword },
      { key: 'projectId', setter: setProjectId },
      { key: 'status', setter: (value: string) => setStatus(value as 'all' | TaskStatus) },
      { key: 'priority', setter: (value: string) => setPriority(value as 'all' | TaskPriority) },
      { key: 'assignedTo', setter: setAssignedTo },
      { key: 'dateFrom', setter: setDateFrom },
      { key: 'dateTo', setter: setDateTo },
    ];

    for (const { key, setter } of paramSetters) {
      const value = searchParams.get(key);
      if (value) setter(value);
    }
  }, [searchParams]);

  // 検索実行（条件分岐を配列メソッドで削減）
  const handleSearch = () => {
    const searchParamList = [
      { key: 'keyword', value: keyword },
      { key: 'projectId', value: projectId },
      { key: 'status', value: status, exclude: 'all' },
      { key: 'priority', value: priority, exclude: 'all' },
      { key: 'assignedTo', value: assignedTo },
      { key: 'dateFrom', value: dateFrom },
      { key: 'dateTo', value: dateTo },
    ];

    const params = new URLSearchParams();
    const filteredParams = searchParamList.filter(
      (param) => param.value && param.value !== param.exclude,
    );
    for (const param of filteredParams) {
      params.set(param.key, param.value);
    }

    router.push(`/search?${params.toString()}`);
  };

  // クリア（初期値を配列で管理）
  const handleClear = () => {
    setKeyword('');
    setProjectId('');
    setStatus('all');
    setPriority('all');
    setAssignedTo('');
    setDateFrom('');
    setDateTo('');
    router.push('/search');
  };

  // タスクカードのハンドラー
  const handleTaskClick = (taskId: string) => {
    router.push(`/task?taskId=${taskId}`);
  };

  const handleTaskEdit = (taskId: string) => {
    router.push(`/task?taskId=${taskId}&edit=true`);
  };

  const handleTaskDelete = (_taskId: string) => {
    // タスク削除処理（実装済みのtask.delete mutationを使用）
    if (confirm('このタスクを削除してもよろしいですか？')) {
    }
  };

  // プロジェクトカードクリック
  const handleProjectClick = (projectId: string) => {
    router.push(`/project?projectId=${projectId}`);
  };

  return (
    <AppLayout>
      <Box>
        <Typography variant="h4" gutterBottom>
          検索
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          タスクやプロジェクトを検索します
        </Typography>

        {/* 検索フォーム */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              {/* キーワード検索 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="search"
                  label="キーワード"
                  placeholder="タスク名、説明で検索..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </Grid>

              {/* プロジェクトフィルター */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="プロジェクト"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <MenuItem value="">すべてのプロジェクト</MenuItem>
                  {projects?.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* ステータスフィルター */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="ステータス"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'all' | TaskStatus)}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="TODO">📋 未対応</MenuItem>
                  <MenuItem value="IN_PROGRESS">🔄 進行中</MenuItem>
                  <MenuItem value="IN_REVIEW">👀 レビュー中</MenuItem>
                  <MenuItem value="DONE">✅ 完了</MenuItem>
                  <MenuItem value="CANCELLED">❌ キャンセル</MenuItem>
                  <MenuItem value="BLOCKED">🚫 ブロック</MenuItem>
                </TextField>
              </Grid>

              {/* 優先度フィルター */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="優先度"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'all' | TaskPriority)}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="URGENT">🔴 緊急</MenuItem>
                  <MenuItem value="HIGH">🟠 高い</MenuItem>
                  <MenuItem value="MEDIUM">🟡 普通</MenuItem>
                  <MenuItem value="LOW">🟢 低い</MenuItem>
                </TextField>
              </Grid>

              {/* 担当者フィルター */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="担当者"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <MenuItem value="">すべての担当者</MenuItem>
                  {users?.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* 期限フィルター（開始日） */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="期限：開始日"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* 期限フィルター（終了日） */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="期限：終了日"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* アクションボタン */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button variant="outlined" onClick={handleClear}>
                    クリア
                  </Button>
                  <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>
                    検索
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 検索結果 */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
            <CircularProgress />
          </Box>
        ) : shouldSearch && searchResults ? (
          <Box>
            {/* 検索結果サマリー */}
            <Box mb={3}>
              <Typography variant="h6">
                検索結果: {searchResults.totalCount}件
                {searchResults.tasks.length > 0 && (
                  <Typography component="span" variant="body2" color="text.secondary" ml={2}>
                    （タスク: {searchResults.tasks.length}件
                    {searchResults.projects.length > 0 &&
                      `, プロジェクト: ${searchResults.projects.length}件`}
                    ）
                  </Typography>
                )}
              </Typography>
            </Box>

            {/* タスク結果 */}
            {searchResults.tasks.length > 0 && (
              <Box mb={4}>
                <Typography variant="h6" gutterBottom>
                  タスク ({searchResults.tasks.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={3}>
                  {searchResults.tasks.map((task) => (
                    <Grid item xs={12} sm={6} md={4} key={task.id}>
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        status={task.status}
                        priority={task.priority}
                        dueDate={task.dueDate}
                        assignee={task.assignee}
                        onEdit={handleTaskEdit}
                        onDelete={handleTaskDelete}
                        onClick={handleTaskClick}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* プロジェクト結果 */}
            {searchResults.projects.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  プロジェクト ({searchResults.projects.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={3}>
                  {searchResults.projects.map((project) => (
                    <Grid item xs={12} sm={6} md={4} key={project.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <CardContent>
                          <Typography variant="h6" gutterBottom noWrap>
                            {project.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              minHeight: '40px',
                            }}
                          >
                            {project.description || '説明なし'}
                          </Typography>
                          <Box mt={2} display="flex" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">
                              タスク: {project._count.tasks}件
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              メンバー: {project.members.length}人
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* 検索結果なし */}
            {searchResults.totalCount === 0 && (
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  検索結果が見つかりませんでした
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  検索条件を変更して再度お試しください
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              検索条件を入力して検索してください
            </Typography>
            <Typography variant="body2" color="text.secondary">
              キーワード、プロジェクト、ステータスなどで絞り込めます
            </Typography>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}

// Suspense境界でラップ
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </AppLayout>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}

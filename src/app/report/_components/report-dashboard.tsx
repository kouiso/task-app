'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Download,
  Assessment,
  TrendingUp,
  Schedule,
  Group,
  Folder,
  Timer,
  CheckCircle,
  Warning,
  Assignment,
  CalendarMonth,
  PictureAsPdf,
  TableChart,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface ReportDashboardProps {
  tasks: any[];
  stats: any;
  tasksByProject: any[];
  tasksByUser: any[];
  projects: any[];
  users: any[];
  currentUserName: string;
}

export function ReportDashboard({
  tasks,
  stats,
  tasksByProject,
  tasksByUser,
  projects,
  users,
  currentUserName,
}: ReportDashboardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  const filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    const matchesDateRange = taskDate >= dateRange.start && taskDate <= dateRange.end;
    const matchesProject = selectedProject === 'all' || task.projectId === selectedProject;
    const matchesUser = selectedUser === 'all' || task.assigneeId === selectedUser;
    return matchesDateRange && matchesProject && matchesUser;
  });

  const statusData = [
    { name: 'TODO', value: stats.todoTasks, color: '#757575' },
    { name: '進行中', value: stats.inProgressTasks, color: '#1976d2' },
    { name: '完了', value: stats.doneTasks, color: '#4caf50' },
    { name: 'キャンセル', value: stats.cancelledTasks, color: '#f44336' },
  ];

  const priorityData = [
    { name: '緊急', value: stats.urgentTasks, color: '#f44336' },
    { name: '高', value: stats.highTasks, color: '#ff9800' },
    { name: '中', value: stats.mediumTasks, color: '#2196f3' },
    { name: '低', value: stats.lowTasks, color: '#9e9e9e' },
  ];

  const projectPerformance = tasksByProject.map(item => ({
    name: item.project.name,
    total: item.tasks.length,
    completed: item.tasks.filter(t => t.status === 'DONE').length,
    completionRate: item.tasks.length > 0 
      ? Math.round((item.tasks.filter(t => t.status === 'DONE').length / item.tasks.length) * 100)
      : 0,
    timeSpent: Math.round(item.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0) / 60),
  }));

  const userPerformance = tasksByUser.map(item => ({
    name: item.user.name || item.user.email,
    assigned: item.assignedTasks.length,
    completed: item.assignedTasks.filter(t => t.status === 'DONE').length,
    inProgress: item.assignedTasks.filter(t => t.status === 'IN_PROGRESS').length,
    timeSpent: Math.round(item.assignedTasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0) / 60),
    productivity: item.assignedTasks.length > 0
      ? Math.round((item.assignedTasks.filter(t => t.status === 'DONE').length / item.assignedTasks.length) * 100)
      : 0,
  }));

  const getLast30DaysData = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => 
        format(new Date(t.createdAt), 'yyyy-MM-dd') === dateStr
      );
      const completedTasks = tasks.filter(t => 
        t.status === 'DONE' && format(new Date(t.updatedAt), 'yyyy-MM-dd') === dateStr
      );
      
      days.push({
        date: format(date, 'MM/dd'),
        created: dayTasks.length,
        completed: completedTasks.length,
      });
    }
    return days;
  };

  const timelineData = getLast30DaysData();

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'タイトル', 'ステータス', '優先度', 'プロジェクト', '担当者', '作成日', '期限', '作業時間(分)'];
    const rows = filteredTasks.map(task => [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.project?.name || '',
      task.assignee?.name || task.assignee?.email || '',
      format(new Date(task.createdAt), 'yyyy-MM-dd'),
      task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      task.timeSpentMinutes || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `task_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <Box sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            レポート
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentUserName}さんのプロジェクト分析レポート
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<TableChart />}
            onClick={exportToCSV}
          >
            CSVエクスポート
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
            <DatePicker
              label="開始日"
              value={dateRange.start}
              onChange={(date) => setDateRange({ ...dateRange, start: date || new Date() })}
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 200 } },
              }}
            />
            <DatePicker
              label="終了日"
              value={dateRange.end}
              onChange={(date) => setDateRange({ ...dateRange, end: date || new Date() })}
              slotProps={{
                textField: { size: 'small', sx: { minWidth: 200 } },
              }}
            />
          </LocalizationProvider>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>プロジェクト</InputLabel>
            <Select
              value={selectedProject}
              label="プロジェクト"
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>担当者</InputLabel>
            <Select
              value={selectedUser}
              label="担当者"
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <MenuItem value="all">すべて</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    総タスク数
                  </Typography>
                  <Typography variant="h4">
                    {filteredTasks.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assignment />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    完了率
                  </Typography>
                  <Typography variant="h4">
                    {filteredTasks.length > 0 
                      ? Math.round((filteredTasks.filter(t => t.status === 'DONE').length / filteredTasks.length) * 100)
                      : 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    期限切れ
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {filteredTasks.filter(t => {
                      if (!t.dueDate) return false;
                      return new Date(t.dueDate) < new Date();
                    }).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Warning />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    総作業時間
                  </Typography>
                  <Typography variant="h6">
                    {formatMinutesToHours(
                      filteredTasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0)
                    )}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Timer />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab label="概要" />
          <Tab label="プロジェクト別" />
          <Tab label="ユーザー別" />
          <Tab label="タイムライン" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ステータス別タスク分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                優先度別タスク分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                プロジェクト別パフォーマンス
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8884d8" name="総タスク" />
                  <Bar dataKey="completed" fill="#82ca9d" name="完了" />
                  <Bar dataKey="timeSpent" fill="#ffc658" name="作業時間(h)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>プロジェクト</TableCell>
                    <TableCell align="right">総タスク</TableCell>
                    <TableCell align="right">完了</TableCell>
                    <TableCell align="right">完了率</TableCell>
                    <TableCell align="right">作業時間</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectPerformance.map((project) => (
                    <TableRow key={project.name}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell align="right">{project.total}</TableCell>
                      <TableCell align="right">{project.completed}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Box sx={{ width: 100, mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={project.completionRate}
                              color={project.completionRate >= 80 ? 'success' : 
                                     project.completionRate >= 50 ? 'warning' : 'error'}
                            />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                              {project.completionRate}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{project.timeSpent}時間</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ユーザー別生産性
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={userPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="assigned" fill="#8884d8" name="割当タスク" />
                  <Bar dataKey="completed" fill="#82ca9d" name="完了" />
                  <Bar dataKey="inProgress" fill="#ffc658" name="進行中" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ユーザー</TableCell>
                    <TableCell align="right">割当タスク</TableCell>
                    <TableCell align="right">完了</TableCell>
                    <TableCell align="right">進行中</TableCell>
                    <TableCell align="right">生産性</TableCell>
                    <TableCell align="right">作業時間</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userPerformance.map((user) => (
                    <TableRow key={user.name}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell align="right">{user.assigned}</TableCell>
                      <TableCell align="right">{user.completed}</TableCell>
                      <TableCell align="right">{user.inProgress}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${user.productivity}%`}
                          size="small"
                          color={user.productivity >= 80 ? 'success' : 
                                 user.productivity >= 50 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">{user.timeSpent}時間</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                過去30日間のアクティビティ
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="created" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8"
                    name="作成"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    name="完了"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              過去30日間で {timelineData.reduce((sum, day) => sum + day.created, 0)} 件のタスクが作成され、
              {timelineData.reduce((sum, day) => sum + day.completed, 0)} 件が完了しました。
            </Alert>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
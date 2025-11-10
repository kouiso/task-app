'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { api } from '@/trpc/react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function WeeklyReportPage() {
  const [weeks, setWeeks] = useState(4);

  const { data: reportData, isLoading } = api.report.getWeeklyReport.useQuery({ weeks });

  if (isLoading) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  const chartData = reportData?.weeklyData.map((week) => ({
    name: week.week,
    completed: week.totalCompleted,
    high: week.byPriority.HIGH || 0,
    urgent: week.byPriority.URGENT || 0,
  }));

  const statusData = reportData?.weeklyData.map((week) => ({
    name: week.week,
    done: week.byStatus.DONE || 0,
    inProgress: week.byStatus.IN_PROGRESS || 0,
    inReview: week.byStatus.IN_REVIEW || 0,
  }));

  return (
    <AppLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Weekly Report</Typography>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={weeks}
              label="Period"
              onChange={(e) => setWeeks(e.target.value as number)}
            >
              <MenuItem value={4}>4 Weeks</MenuItem>
              <MenuItem value={8}>8 Weeks</MenuItem>
              <MenuItem value={12}>12 Weeks</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Completed
                </Typography>
                <Typography variant="h3">{reportData?.totalCompleted || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Average per Week
                </Typography>
                <Typography variant="h3">
                  {reportData?.totalCompleted ? Math.round(reportData.totalCompleted / weeks) : 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Period
                </Typography>
                <Typography variant="h5">
                  {reportData?.startDate && reportData?.endDate
                    ? `${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}`
                    : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Completed Tasks by Week
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#8884d8"
                      name="Total Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Priority Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="urgent" fill="#f44336" name="Urgent" />
                    <Bar dataKey="high" fill="#ff9800" name="High" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Status Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="done" fill="#4caf50" name="Done" stackId="status" />
                    <Bar dataKey="inProgress" fill="#2196f3" name="In Progress" stackId="status" />
                    <Bar dataKey="inReview" fill="#ff9800" name="In Review" stackId="status" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}

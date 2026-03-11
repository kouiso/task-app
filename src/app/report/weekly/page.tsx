'use client';

import { Loader2 } from 'lucide-react';
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
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { api } from '@/trpc/react';

export default function WeeklyReportPage() {
  const [weeks, setWeeks] = useState('4');

  const { data: reportData, isLoading } = api.report.getWeeklyReport.useQuery({
    weeks: Number.parseInt(weeks, 10),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const chartData = reportData?.weeklyData.map((week) => ({
    name: week.week,
    completed: week.totalCompleted,
    high: week.byPriority['HIGH'] || 0,
    urgent: week.byPriority['URGENT'] || 0,
  }));

  const statusData = reportData?.weeklyData.map((week) => ({
    name: week.week,
    done: week.byStatus['DONE'] || 0,
    inProgress: week.byStatus['IN_PROGRESS'] || 0,
    inReview: week.byStatus['IN_REVIEW'] || 0,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">週次レポート</h1>
            <p className="text-muted-foreground">週ごとのタスク進捗の詳細レポートです。</p>
          </div>
          <div className="w-[150px]">
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger>
                <SelectValue placeholder="期間" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4週間</SelectItem>
                <SelectItem value="8">8週間</SelectItem>
                <SelectItem value="12">12週間</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 概要統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">完了タスク合計</p>
              <p className="text-3xl font-bold">{reportData?.totalCompleted || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">週平均</p>
              <p className="text-3xl font-bold">
                {reportData?.totalCompleted
                  ? Math.round(reportData.totalCompleted / Number.parseInt(weeks, 10))
                  : 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">対象期間</p>
              <p className="text-lg font-semibold">
                {reportData?.startDate && reportData?.endDate
                  ? `${new Date(reportData.startDate).toLocaleDateString()} - ${new Date(reportData.endDate).toLocaleDateString()}`
                  : '-'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>週別完了タスク数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#8884d8"
                      name="完了数"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>優先度別分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="urgent" fill="#f44336" name="緊急" />
                    <Bar dataKey="high" fill="#ff9800" name="高" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ステータス別内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="done" fill="#4caf50" name="完了" stackId="status" />
                    <Bar dataKey="inProgress" fill="#2196f3" name="進行中" stackId="status" />
                    <Bar dataKey="inReview" fill="#ff9800" name="レビュー中" stackId="status" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

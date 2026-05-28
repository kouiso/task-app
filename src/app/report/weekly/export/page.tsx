'use client';

import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { normalizeReportWeeksParam } from '@/lib/report-path';

export default function WeeklyReportExportPage() {
  const searchParams = useSearchParams();
  const weeks = normalizeReportWeeksParam(searchParams.get('weeks'));

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">週次レポート出力</h1>
        <Card>
          <CardHeader>
            <CardTitle>出力対象</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{weeks}週間の週次データを出力します。</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

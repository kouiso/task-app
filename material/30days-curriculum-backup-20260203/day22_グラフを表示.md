# Day 22: グラフを表示しよう

## 🎯 今日のゴール

Rechartsライブラリを使って、タスクの統計をグラフで可視化します。円グラフと棒グラフを実装します。

【スクリーンショット: 円グラフと棒グラフ】

## 🤔 なぜこれを作るのか?

数字だけでは分かりにくい情報を視覚化する機能です。**グラフは天気予報の図のようなもの**。「降水確率60%」と文字で見るより、青い雨雲のマークを見た方が直感的に理解できます。それと同じく、グラフで見ることで、プロジェクトの状態を瞬時に把握できます。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | Rechartsインストール | 5分 |
| Step 2 | 円グラフ実装 | 20分 |
| Step 3 | 棒グラフ実装 | 20分 |
| Step 4 | レスポンシブ対応 | 10分 |

**合計時間**: 約55分

---

### Step 1: Rechartsインストール（5分）

💻 **実装**:

```bash
# filepath: ターミナル（コマンドラインで実行）
$ npm install recharts
```

✅ **確認ポイント**: package.jsonにrechartsが追加される

【スクリーンショット: 確認画面】

---

### Step 2: 円グラフ実装（20分）

💻 **実装**:

```typescript
// filepath: src/components/dashboard/TaskStatusChart.tsx（パート1/3）
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

interface TaskStatusChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = {
  TODO: '#9e9e9e',
  IN_PROGRESS: '#2196f3',
  IN_REVIEW: '#ff9800',
  DONE: '#4caf50',
};

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
```

```typescript
// filepath: src/components/dashboard/TaskStatusChart.tsx（パート2/3）
        ステータス別タスク数
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name as keyof typeof COLORS]}
              />
            ))}
          </Pie>
```

```typescript
// filepath: src/components/dashboard/TaskStatusChart.tsx（パート3/3）
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
```

✅ **確認ポイント**: 円グラフが表示される

【スクリーンショット: 確認画面】

---

### Step 3: 棒グラフ実装（20分）

💻 **実装**:

```typescript
// filepath: src/components/dashboard/ProjectTasksChart.tsx（パート1/2）
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography } from '@mui/material';

interface ProjectTasksChartProps {
  data: {
    projectName: string;
    total: number;
    completed: number;
  }[];
}

export function ProjectTasksChart({ data }: ProjectTasksChartProps) {
```

```typescript
// filepath: src/components/dashboard/ProjectTasksChart.tsx（パート2/2）
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        プロジェクト別タスク数
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="projectName" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" fill="#8884d8" name="総タスク数" />
          <Bar dataKey="completed" fill="#82ca9d" name="完了タスク数" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
```

✅ **確認ポイント**: 棒グラフが表示される

【スクリーンショット: 確認画面】

---

### Step 4: レスポンシブ対応（10分）

💻 **実装**:

```typescript
// filepath: src/app/dashboard/page.tsx（パート1/2）
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart';
import { ProjectTasksChart } from '@/components/dashboard/ProjectTasksChart';

export default function DashboardPage() {
  const { data: stats } = api.report.getStats.useQuery();
  const { data: chartData } = api.report.getChartData.useQuery();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>ダッシュボード</Typography>

      {/* 統計カード (Day 21) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* カード4枚 */}
      </Grid>

      {/* グラフ */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TaskStatusChart data={chartData?.statusData ?? []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProjectTasksChart data={chartData?.projectData ?? []} />
```

```typescript
// filepath: src/app/dashboard/page.tsx（パート2/2）
        </Grid>
      </Grid>
    </Box>
  );
}
```

✅ **確認ポイント**: モバイルでは縦並び、PCでは横並びで表示される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **Recharts**: React用のグラフライブラリ
- **ResponsiveContainer**: 親要素に合わせてサイズ調整
- **PieChart**: 円グラフコンポーネント
- **BarChart**: 棒グラフコンポーネント
- **Cell**: 円グラフの各セクションに色を設定
- **label プロパティ**: グラフ上にラベルを表示

## 📋 今日のまとめ

- [ ] Rechartsをインストールできた
- [ ] 円グラフを実装できた
- [ ] 棒グラフを実装できた
- [ ] レスポンシブ対応できた

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| グラフが表示されない | ResponsiveContainer の height 未指定 | height={300} を追加 |
| 色が全部同じ | Cell で色を指定していない | map で各データに色を設定 |
| モバイルで横スクロール | width="100%" が効いていない | ResponsiveContainer を使用 |

## 🔗 次回予告

Day 23では、週次レポート機能を実装します。

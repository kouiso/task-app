# Day 23: 週次レポートを表示しよう

## 🔙 前回の振り返り

Day 22 では Recharts ライブラリを使って、ステータス別・優先度別の円グラフを実装しました。`Map` によるグラフ用データ集計や `ResponsiveContainer` でのレスポンシブ対応も学んだので、今日はプロジェクト別統計テーブルと週次レポート機能に取り組みます。

---

## 🎯 今日のゴール

レポートページにプロジェクト別統計テーブルと
週次レポート機能を追加します。テーブルで進捗を
一覧表示し、APIで週次データを取得します。

📸 スクリーンショット: プロジェクト統計テーブルの表示を確認してください。

![プロジェクト統計テーブルの表示を確認してください。](./screenshots/report-weekly.png)
## 🤔 なぜこれを作るのか？

プロジェクトごとの進捗を比較し、
チーム全体の生産性を週単位で把握します。

> 💡 **例え話**: プロジェクト統計は
> 「学校の通信簿」です。
> 各教科（プロジェクト）ごとに成績（進捗率）
> や勉強時間（作業時間）が書かれています。
> 通信簿を見れば、どの教科が順調で
> どこを頑張るべきかが一目でわかります。

### 📐 プロジェクト統計の計算フロー

```mermaid
flowchart TD
    A[api.task.getAll] --> B[tasks 配列]
    C[api.project.getAll] --> D[projects 配列]
    B --> E[projectId でフィルタ]
    D --> E
    E --> F[完了タスク数を計算]
    E --> G[進捗率を計算]
    E --> H[合計作業時間を計算]
    F --> I[projectStats 配列]
    G --> I
    H --> I
    I --> J[Table で一覧表示]

    style A fill:#e3f2fd
    style C fill:#e3f2fd
    style E fill:#fff3e0
    style J fill:#e8f5e9
```

### やること / やらないこと

| やること | やらないこと |
|---------|-------------|
| プロジェクト別統計テーブル | 専用の統計API作成 |
| 週次レポートAPI呼び出し | グラフの追加（Day 22済） |
| 週次データの表示 | ユーザー別フィルタUI |
| Table コンポーネント活用 | カスタムテーブル作成 |

### 🆕 新しく学ぶ概念

| 概念 | 読み方 | 役割 | 例え |
|------|--------|------|------|
| projectStats | — | プロジェクト別集計 | 通信簿の各教科 |
| Table | テーブル | 表形式の表示 | Excel の表 |
| getWeeklyReport | — | 週次データ取得API | 週間天気予報 |
| filter + reduce | — | 条件付き集計 | 特定科目の平均点 |

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | プロジェクト統計の考え方 | 3分 |
| Step 2 | プロジェクト別統計を計算 | 5分 |
| Step 3 | 統計テーブルを表示 | 5分 |
| Step 4 | 週次レポートAPIの概要 | 3分 |
| Step 5 | 週次レポートAPIを呼び出す | 5分 |
| Step 6 | 週次データを表示する | 5分 |
| Step 7 | 動作確認 | 3分 |

**合計時間**: 約29分

---

### Step 1: プロジェクト統計の考え方（3分）

🎯 **ゴール**: プロジェクトごとの
統計値をどう計算するか理解します。

#### 統計テーブルに表示する項目

| 項目 | 計算方法 | 意味 |
|------|---------|------|
| プロジェクト | project.name | プロジェクト名 |
| タスク数 | filter結果の長さ | タスク総数 |
| 完了 | DONE の件数 | 完了タスク数 |
| 進捗 | 完了数 / 総数 × 100 | 進捗率（%） |
| 作業時間 | reduce で合算 / 60 | 作業時間（h） |

#### 計算の流れ

| 手順 | 処理 | 例 |
|------|------|-----|
| 1 | projectId でタスクを絞る | Aのタスクだけ |
| 2 | status が DONE のものを数える | 完了タスクは3件 |
| 3 | 完了数 / 全数 × 100 | 3/10 × 100 = 30% |
| 4 | timeSpentMinutes を合算 | 480分 = 8.0h |

```typescript
// filepath: src/app/report/page.tsx
// useMemo のインポートを確認
import { useMemo } from 'react';
```

> 💡 Day 21 で学んだ `reduce` と
> JavaScript の `filter` メソッドを
> 組み合わせて、プロジェクト単位で
> 集計します。

✅ **確認ポイント**:
- 表の4項目（タスク数・完了・進捗・作業時間）の計算式を自分の言葉で説明できる

---

### Step 2: プロジェクト別統計を計算（5分）

🎯 **ゴール**: projects.map で
各プロジェクトの統計値を計算します。

💻 **実装**:

```typescript
// filepath: src/app/report/page.tsx
// プロジェクト別の統計値を計算（前半）
const projectStats = useMemo(
  () =>
    projects?.map((project) => {
      const projectTasks =
        tasks?.filter(
          (t) => t.projectId === project.id
        ) ?? [];
      const completedTasks =
        projectTasks.filter(
          (t) => t.status === TASK_STATUS.DONE
        );
      const totalTime =
        projectTasks.reduce(
          (acc, t) =>
            acc + (t.timeSpentMinutes ?? 0),
          0
        );
```

上のコードに続けて、同じ `useMemo` の中に
以下を追加します。

```typescript
// filepath: src/app/report/page.tsx
// 進捗率の計算と戻り値（後半）
      const progress =
        projectTasks.length > 0
          ? (completedTasks.length
              / projectTasks.length) * 100
          : 0;
      return {
        id: project.id,
        name: project.name,
        totalTasks: projectTasks.length,
        completedTasks:
          completedTasks.length,
        progress: progress.toFixed(1),
        totalTimeHours:
          (totalTime / 60).toFixed(1),
      };
    }),
  [projects, tasks],
);
```

> 💡 `TASK_STATUS.DONE` は Day 21 で
> インポート済みの定数です。`projects?.map`
> で各プロジェクトをループし、
> `tasks?.filter` でそのプロジェクトの
> タスクだけを取り出します。
>
> **豆知識**: `?? []` は `null`/`undefined` のみ
> 空配列に変換します。`|| []` とは異なり
> `0` や空文字を誤判定しません。

✅ **確認ポイント**:
- projectStats に配列が入る
- 各要素に5つのプロパティがある

---

### Step 3: 統計テーブルを表示（5分）

🎯 **ゴール**: Table コンポーネントで
プロジェクト統計を表形式で表示します。

💻 **実装**:

```typescript
// filepath: src/app/report/page.tsx
// Table 関連のインポートを追加
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/component/ui/table';
```

```typescript
// filepath: src/app/report/page.tsx
// プロジェクト統計テーブルのヘッダー
<Card>
  <CardHeader>
    <CardTitle>プロジェクト統計</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">
            プロジェクト</TableHead>
          <TableHead className="text-right">
            タスク数</TableHead>
          <TableHead className="text-right">
            完了</TableHead>
          <TableHead className="text-right">
            進捗</TableHead>
          <TableHead className="text-right">
            作業時間</TableHead>
        </TableRow>
      </TableHeader>
    </Table>
  </CardContent>
</Card>
```

✅ **確認ポイント**:
- テーブルのヘッダー5列を定義した

上のコードの `</Table>` の直前に、以下のテーブル本体を追加します。

```typescript
// filepath: src/app/report/page.tsx
// テーブルの本体（mapで各行を生成）
<TableBody>
  {projectStats?.map((stat) => (
    <TableRow key={stat.id}>
      <TableCell className="font-medium">
        {stat.name}
      </TableCell>
      <TableCell className="text-right">
        {stat.totalTasks}
      </TableCell>
      <TableCell className="text-right">
        {stat.completedTasks}
      </TableCell>
      <TableCell className="text-right">
        {stat.progress}%
      </TableCell>
      <TableCell className="text-right">
        {stat.totalTimeHours}h
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

✅ **確認ポイント**:
- テーブルにプロジェクト名が並ぶ
- 数値が右寄せで表示される

#### Table コンポーネントの構造

| コンポーネント | 役割 | HTML相当 |
|--------------|------|---------|
| Table | テーブル全体 | `<table>` |
| TableHeader | ヘッダー領域 | `<thead>` |
| TableHead | 見出しセル | `<th>` |
| TableBody | データ領域 | `<tbody>` |
| TableRow | 行 | `<tr>` |
| TableCell | データセル | `<td>` |

> 💡 shadcn/ui の Table はHTML の
> テーブル要素をラップしたものです。
> `text-right` で数値を右寄せにすると
> 表が見やすくなります。


📸 スクリーンショット: プロジェクト統計テーブル完成の表示を確認してください。

![プロジェクト統計テーブル完成の表示を確認してください。](./screenshots/report-weekly.png)
---

### Step 4: 週次レポートAPIの概要（3分）

🎯 **ゴール**: いよいよ週次レポートです!
まずはAPIがどんなデータを返してくれるか
覗いてみましょう。

```typescript
// filepath: src/server/api/routers/report.ts
// APIの入力バリデーション定義
z.object({
  weeks: z.number()
    .min(1).max(12).default(4),
  userId: z.string().cuid().optional(),
})
```

#### APIのパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| weeks | number | いいえ（デフォルト: 4） | 取得する週数（1〜12） |
| userId | string | いいえ | 特定ユーザーに絞る |

#### APIのレスポンス

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| weeks | number | 指定した週数 |
| startDate | string | 集計開始日 |
| endDate | string | 集計終了日 |
| weeklyData | array | 週ごとのデータ配列 |
| totalCompleted | number | 期間内の完了総数 |

#### weeklyData の各要素

| プロパティ | 型 | 説明 |
|-----------|-----|------|
| week | string | `1週目` のような週ラベル |
| weekStart | string | その週の開始日 |
| totalCompleted | number | その週の完了数 |
| byStatus | object | ステータス別の件数 |
| byPriority | object | 優先度別の件数 |

> 💡 サーバー側で Prisma を使って
> `completedAt` の日付範囲でタスクを
> フィルタし、週ごとに集計しています。

✅ **確認ポイント**:
- APIのパラメータとレスポンスの構造を理解した
- `weeklyData` が週ごとのデータ配列であることを把握した

---

### Step 5: 週次レポートAPIを呼び出す（5分）

🎯 **ゴール**: 週次レポートページで
APIを呼び出してデータを取得します。

💻 **実装**:

```typescript
// filepath: src/app/report/weekly/page.tsx
'use client';
// 日付処理ライブラリ
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
// React フック
import { useState } from 'react';
// レイアウト・UIコンポーネント
import { AppLayout }
  from '@/component/layout/app-layout';
import {
  Card, CardContent,
  CardHeader, CardTitle,
} from '@/component/ui/card';
import { PageLoadingSpinner }
  from '@/component/ui/loading-spinner';
import {
  Select, SelectContent,
  SelectItem, SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
// APIクライアント
import { api } from '@/trpc/react';
```

```typescript
// filepath: src/app/report/weekly/page.tsx
// APIの呼び出しとローディング処理
export default function WeeklyReportPage() {
  const [weeks, setWeeks] = useState('4');

  const {
    data: reportData,
    isLoading,
  } = api.report.getWeeklyReport.useQuery({
    weeks: Number.parseInt(weeks, 10),
  });

  if (isLoading) {
    return <PageLoadingSpinner />;
  }
```

```typescript
// filepath: src/app/report/weekly/page.tsx
// 週数の選択UI
<div className="w-[150px]">
  <Select
    value={weeks}
    onValueChange={setWeeks}>
    <SelectTrigger>
      <SelectValue placeholder="期間" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="4">
        4週間
      </SelectItem>
      <SelectItem value="8">
        8週間
      </SelectItem>
      <SelectItem value="12">
        12週間
      </SelectItem>
    </SelectContent>
  </Select>
</div>
```

> 💡 `useState` で週数を管理します。
> ユーザーが週数を変更すると、
> `useQuery` が自動的に再取得します。

#### ページ全体のJSX構造

return文は以下のツリー構造で組み立てます。

| 階層 | 要素 | 役割 |
|------|------|------|
| 1 | `<AppLayout>` | 共通レイアウト |
| 2 | `<div className="space-y-6">` | 縦方向の余白 |
| 3 | ヘッダー（h1 + Select） | タイトルと期間選択 |
| 3 | `grid grid-cols-3` | 3枚のカード（Step 6） |

✅ **確認ポイント**:
- ファイルを保存してエラーがないことを確認した
- `<AppLayout>` でページ全体をラップしている

📸 スクリーンショット: ローディング中にスピナーが表示されることを確認してください。

![ローディング中にスピナーが表示されることを確認してください。](./screenshots/report-weekly.png)
---

### Step 6: 週次データを表示する（5分）

🎯 **ゴール**: 取得した週次データを
カードで表示します。

チームリーダーが毎週確認したい数字は何でしょう?
「合計・平均・期間」の3つをカードで表示します。

💻 **実装**:

```typescript
// filepath: src/app/report/weekly/page.tsx
// 完了タスク数カード
<div className="grid grid-cols-1
  md:grid-cols-3 gap-4">
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm
        text-muted-foreground mb-1">
        完了タスク合計
      </p>
      <p className="text-3xl font-bold">
        {reportData?.totalCompleted ?? 0}
      </p>
    </CardContent>
  </Card>
```

✅ **確認ポイント**:
- 完了タスク合計の数値が表示される

```typescript
// filepath: src/app/report/weekly/page.tsx
// 平均完了数カード
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm
        text-muted-foreground mb-1">
        週平均
      </p>
      <p className="text-3xl font-bold">
        {reportData?.totalCompleted
          ? Math.round(
              reportData.totalCompleted
              / Number.parseInt(weeks, 10)
            )
          : 0}
      </p>
    </CardContent>
  </Card>
```

✅ **確認ポイント**:
- 週平均の数値が表示される

```typescript
// filepath: src/app/report/weekly/page.tsx
// 期間表示カード（date-fns で整形）
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm
        text-muted-foreground mb-1">
        対象期間</p>
      <p className="text-lg font-semibold">
        {reportData?.startDate
          && reportData?.endDate
          ? `${format(
              new Date(reportData.startDate),
              'yyyy/MM/dd', { locale: ja }
            )} - ${format(
              new Date(reportData.endDate),
              'yyyy/MM/dd', { locale: ja }
            )}`
          : '-'}
      </p>
    </CardContent>
  </Card>
</div>
```

> 💡 `format` と `ja` ロケールで
> 日付を `yyyy/MM/dd` 形式に変換します。
> データがないときは `'-'` を表示します。

✅ **確認ポイント**:
- 3枚のカードが横並びで表示される
- 完了数と平均が正しく計算される

#### 週次レポートの表示項目

| カード | 表示内容 | 計算方法 |
|-------|---------|---------|
| 完了タスク合計 | 期間内の完了数 | API が返す値 |
| 週平均 | 週あたり平均 | 完了数 / 週数 |
| 対象期間 | 集計期間 | 開始日 - 終了日 |

> 💡 `Math.round` で小数を丸めます。
> 対象期間は `reportData?.startDate` と
> `reportData?.endDate` の両方をチェック
> してから表示しています。


📸 スクリーンショット: 週次レポート完成の表示を確認してください。

![週次レポート完成の表示を確認してください。](./screenshots/report-weekly.png)
---

### Step 7: 動作確認（3分）

🎯 **ゴール**: 全体の表示を確認します。

```bash
# filepath: ターミナル
# 開発サーバーを起動して確認
npm run dev
```

1. `/report` にアクセス
2. 統計カード（Day 21）が表示される
3. 円グラフ（Day 22）が表示される
4. プロジェクト統計テーブルが表示される
5. 各プロジェクトの進捗率が正しい
6. `/report/weekly` にアクセス
7. 週次レポートのカードが表示される

✅ **確認ポイント**:
- テーブルの数値がシードデータと一致
- 週次レポートにデータが表示される

📸 スクリーンショット: レポートページ全体の表示を確認してください。

![レポートページ全体の表示を確認してください。](./screenshots/report-weekly.png)

## 📋 今日のまとめ

- [ ] プロジェクト別統計を計算できた
- [ ] Table コンポーネントで一覧表示した
- [ ] 週次レポートAPIを呼び出せた
- [ ] 週次データをカードで表示した

## ⚠️ つまずきポイント

| エラー / 問題 | 原因 | 解決方法 |
|--------------|------|---------|
| テーブルが空 | projectStats が undefined | projects?.map で安全に処理 |
| 進捗率が NaN | タスク0件で割り算 | length > 0 チェック追加 |
| 週次データが空 | completedAt 未設定 | シードデータを確認 |
| 型エラーが出る | weeks が string | Number.parseInt で変換 |

## 📝 今日学んだ用語

| 用語 | 意味 |
|------|------|
| projectStats | プロジェクト別の集計結果配列 |
| Table / TableRow | shadcn/ui のテーブル部品 |
| getWeeklyReport | 週次レポート取得API |
| Number.parseInt | 文字列を整数に変換する関数 |

## 🔜 次回予告

Day 24 では、管理者専用のユーザー一覧ページを
実装します。権限チェックでアクセスを制限し、
ユーザー情報をテーブルで管理できるようにします。

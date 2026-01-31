# Day 09: プロジェクト一覧画面を作ろう

## 🎯 今日のゴール

プロジェクトの一覧を表示する画面を作ります。カード形式でプロジェクトを表示し、クリックで詳細ページに遷移できるようにします。

【スクリーンショット: プロジェクト一覧画面】

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | プロジェクト一覧ページ作成 | 10分 |
| Step 2 | tRPC APIで取得 | 15分 |
| Step 3 | カード表示 | 15分 |
| Step 4 | レイアウト調整 | 10分 |

**合計時間**: 約50分

---

### Step 1: プロジェクト一覧ページ作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/page.tsx
'use client';

import { Box, Typography } from '@mui/material';

export default function ProjectsPage() {
  return (
    <Box>
      <Typography variant="h4">プロジェクト一覧</Typography>
    </Box>
  );
}
```

✅ **確認ポイント**: /projectsにアクセスして「プロジェクト一覧」が表示される

---

### Step 2: tRPC APIで取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/page.tsx
import { api } from '@/trpc/react';

export default function ProjectsPage() {
  const { data: projects, isLoading } = api.project.getAll.useQuery();

  if (isLoading) {
    return <Typography>読み込み中...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4">プロジェクト一覧</Typography>
      {projects?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </Box>
  );
}
```

✅ **確認ポイント**: プロジェクト名が一覧表示される

---

### Step 3: カード表示（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/page.tsx
import { Card, CardContent, CardActionArea } from '@mui/material';
import Link from 'next/link';

export default function ProjectsPage() {
  return (
    <Box>
      {projects?.map((project) => (
        <Card key={project.id} sx={{ mb: 2 }}>
          <CardActionArea component={Link} href={`/projects/${project.id}`}>
            <CardContent>
              <Typography variant="h6">{project.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {project.description}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
```

✅ **確認ポイント**: プロジェクトがカード形式で表示される

---

## 📋 今日のまとめ

- [ ] プロジェクト一覧ページを作成できた
- [ ] tRPCでデータを取得できた
- [ ] カード形式で表示できた

## 🔗 次回予告

Day 10では、プロジェクト新規作成機能を実装します。

# Day 09: プロジェクト一覧画面を作ろう

## 🎯 今日のゴール

プロジェクトの一覧を表示する画面を作ります。カード形式でプロジェクトを表示し、クリックで詳細ページに遷移できるようにします。

【スクリーンショット: プロジェクト一覧画面】

## 🤔 なぜこれを作るのか？

タスク管理アプリの基本となるプロジェクト一覧画面です。複数のプロジェクトを視覚的に整理して表示することで、ユーザーは自分が関わっているプロジェクトを一目で把握できます。

> 💡 **例え話**: プロジェクト一覧は本棚のようなものです。本棚に本が整理されていれば、読みたい本をすぐに見つけられます。同様に、プロジェクトが一覧で表示されていれば、作業したいプロジェクトにすぐアクセスできます。

### 📐 データベース構造図（ER図）

```mermaid
erDiagram
    User ||--o{ Task : "作成"
    User ||--o{ Task : "担当"
    User ||--o{ ProjectMember : "所属"
    User ||--o{ Comment : "投稿"

    Project ||--o{ Task : "含む"
    Project ||--o{ ProjectMember : "メンバー"

    Task ||--o{ Comment : "コメント"

    User {
        string id PK
        string email
        string name
        string role
        boolean isActive
    }

    Project {
        string id PK
        string name
        string description
        string color
        boolean isArchived
    }

    Task {
        string id PK
        string title
        string status
        string priority
        date dueDate
    }

    ProjectMember {
        string id PK
        string role
        date joinedAt
    }

    Comment {
        string id PK
        string content
        date createdAt
    }
```

この図は、User（ユーザー）、Project（プロジェクト）、Task（タスク）、Comment（コメント）の関係を示しています。

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

export default function ProjectsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">プロジェクト一覧</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /projectsにアクセスして「プロジェクト一覧」が表示される

【スクリーンショット: 確認画面】

---

### Step 2: tRPC APIで取得（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/page.tsx
'use client';

import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const { data: projects, isLoading } = api.project.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">プロジェクト一覧</h1>
      {projects?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

✅ **確認ポイント**: プロジェクト名が一覧表示される

【スクリーンショット: 確認画面】

---

### Step 3: カード表示（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/page.tsx
'use client';

import { api } from '@/trpc/react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/component/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { data: projects, isLoading } = api.project.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">プロジェクト一覧</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

✅ **確認ポイント**: プロジェクトがカード形式で表示される

【スクリーンショット: 確認画面】

---

## 📋 今日のまとめ

- [ ] プロジェクト一覧ページを作成できた
- [ ] tRPCでデータを取得できた
- [ ] カード形式で表示できた

## 🔗 次回予告

Day 10では、プロジェクト新規作成機能を実装します。

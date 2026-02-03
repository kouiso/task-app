# Day 20: タスク検索機能を実装しよう

## 🎯 今日のゴール

キーワードでタスクを検索できる機能を実装します。タイトルと説明文から該当するタスクを見つけられるようにします。

【スクリーンショット: 検索画面と結果】

## 🤔 なぜこれを作るのか?

タスクが増えると、目的のタスクを探すのが大変になります。**検索機能は図書館の検索端末のようなもの**。本棚を端から端まで探さなくても、キーワードを入力すれば目的の本がすぐ見つかります。それと同じく、検索機能があれば、大量のタスクの中から必要なものをすぐに見つけられます。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 検索ページ作成 | 10分 |
| Step 2 | 検索フォーム実装 | 15分 |
| Step 3 | 検索API呼び出し | 15分 |
| Step 4 | 検索結果の表示 | 15分 |

**合計時間**: 約55分

---

### Step 1: 検索ページ作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/search/page.tsx
'use client';

export default function SearchPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">タスク検索</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /searchにアクセスして「タスク検索」が表示される

【スクリーンショット: 確認画面】

---

### Step 2: 検索フォーム実装（15分）

💻 **実装**:

```typescript
// filepath: src/app/search/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('検索:', query);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">タスク検索</h1>

      <form onSubmit={handleSearch}>
        <div className="flex gap-4 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="タスクを検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={!query.trim()}>
            検索
          </Button>
        </div>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: 検索フォームが表示され、入力できる

【スクリーンショット: 確認画面】

---

### Step 3: 検索API呼び出し（15分）

💻 **実装**:

```typescript
// filepath: src/app/search/page.tsx（API連携部分）
import { api } from '@/trpc/react';
import { Loader2 } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: results, isLoading } = api.search.tasks.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">タスク検索</h1>

      <form onSubmit={handleSearch}>
        {/* フォーム内容は同じ */}
      </form>

      {isLoading && (
        <div className="flex justify-center mt-6">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {results && (
        <p className="text-sm text-muted-foreground mt-4">
          {results.length}件の結果
        </p>
      )}
    </div>
  );
}
```

✅ **確認ポイント**: 検索ボタンをクリックすると件数が表示される

【スクリーンショット: 確認画面】

---

### Step 4: 検索結果の表示（15分）

💻 **実装**:

```typescript
// filepath: src/app/search/page.tsx（検索結果部分）
import { Card, CardHeader, CardTitle, CardDescription } from '@/component/ui/card';
import { Badge } from '@/component/ui/badge';
import Link from 'next/link';

export default function SearchPage() {
  return (
    <div className="p-6">
      {/* フォーム部分 */}

      {results && results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.projectId}/tasks`}
            >
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex gap-2 mb-2">
                    <Badge
                      style={{ backgroundColor: task.project.color }}
                      className="text-white"
                    >
                      {task.project.name}
                    </Badge>
                    <Badge variant="outline">{task.status}</Badge>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  {task.description && (
                    <CardDescription className="line-clamp-2">
                      {task.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-center mt-6">
          検索結果が見つかりませんでした
        </p>
      )}
    </div>
  );
}
```

✅ **確認ポイント**: 検索結果がカード形式で表示される

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **relative/absolute配置**: テキストフィールドにアイコンを追加
- **enabled オプション**: 条件が満たされたときだけクエリを実行
- **2つのstate**: query（入力中）と searchQuery（確定後）を分離
- **line-clamp-2**: 複数行テキストを2行で省略（Tailwind CSS）
- **hover:bg-accent**: ホバー時の背景色変更

## 📋 今日のまとめ

- [ ] 検索ページを作成できた
- [ ] 検索フォームを実装できた
- [ ] 検索APIを呼び出せた
- [ ] 検索結果を表示できた

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 文字入力のたびにAPIが呼ばれる | onChange で直接 searchQuery を更新 | submit 時だけ searchQuery を更新 |
| 結果が0件でもメッセージが出ない | results が undefined のケースを考慮していない | results && results.length === 0 で判定 |
| 説明文が長すぎる | 省略処理がない | line-clamp-2 で行数制限 |

## 🔗 次回予告

Day 21では、ダッシュボードに統計カードを表示します。

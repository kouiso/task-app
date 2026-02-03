# Day 10: プロジェクト新規作成を実装しよう

## 🎯 今日のゴール

新しいプロジェクトを作成できる画面を実装します。フォームを作成して、Prismaでデータベースに保存します。

【スクリーンショット: プロジェクト作成フォーム】

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 作成ページを作成 | 10分 |
| Step 2 | フォームを実装 | 15分 |
| Step 3 | tRPC mutationで保存 | 15分 |
| Step 4 | バリデーション追加 | 10分 |

**合計時間**: 約50分

---

### Step 1: 作成ページを作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/new/page.tsx
'use client';

export default function NewProjectPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">新規プロジェクト作成</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /projects/newにアクセスできる

【スクリーンショット: 確認画面】

---

### Step 2: フォームを実装（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/new/page.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Label } from '@/component/ui/label';
import { Textarea } from '@/component/ui/textarea';

export default function NewProjectPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, description });
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">新規プロジェクト作成</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">プロジェクト名</Label>
          <Input
            id="name"
            className="w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            className="w-full"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">作成</Button>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: フォームが表示される

【スクリーンショット: 確認画面】

---

### Step 3: tRPC mutationで保存（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/new/page.tsx（API連携部分）
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router = useRouter();
  const createMutation = api.project.create.useMutation({
    onSuccess: (data) => {
      router.push(`/projects/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description });
  };

  // UIは同じ構造
}
```

✅ **確認ポイント**: プロジェクトが作成され、詳細ページに遷移する

【スクリーンショット: 確認画面】

---

## 📋 今日のまとめ

- [ ] プロジェクト作成ページを作成できた
- [ ] フォームを実装できた
- [ ] tRPC mutationでデータを保存できた

## 🔗 次回予告

Day 11では、プロジェクトの編集・削除機能を実装します。

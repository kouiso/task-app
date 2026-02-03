# Day 11: プロジェクト編集・削除を実装しよう

## 🎯 今日のゴール

既存のプロジェクトを編集・削除できる機能を実装します。

【スクリーンショット: プロジェクト編集画面】

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 編集ページを作成 | 10分 |
| Step 2 | 編集処理を実装 | 15分 |
| Step 3 | 削除処理を実装 | 10分 |
| Step 4 | 確認ダイアログ追加 | 10分 |

**合計時間**: 約45分

---

### Step 1: 編集ページを作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/edit/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { api } from '@/trpc/react';

export default function EditProjectPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { data: project } = api.project.getById.useQuery({ id });

  if (!project) {
    return <div>読み込み中...</div>;
  }

  return <div>編集: {project.name}</div>;
}
```

✅ **確認ポイント**: /projects/[id]/editでプロジェクト情報が表示される

【スクリーンショット: 確認画面】

---

### Step 2: 編集処理を実装（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/edit/page.tsx（編集処理部分）
const updateMutation = api.project.update.useMutation({
  onSuccess: () => {
    router.push(`/projects/${id}`);
  },
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  updateMutation.mutate({ id, name, description });
};
```

✅ **確認ポイント**: プロジェクトが更新される

【スクリーンショット: 確認画面】

---

### Step 3: 削除処理を実装（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/edit/page.tsx（削除処理部分）
const deleteMutation = api.project.delete.useMutation({
  onSuccess: () => {
    router.push('/projects');
  },
});

const handleDelete = () => {
  if (confirm('本当に削除しますか？')) {
    deleteMutation.mutate({ id });
  }
};
```

✅ **確認ポイント**: プロジェクトが削除される

【スクリーンショット: 確認画面】

---

## 📋 今日のまとめ

- [ ] プロジェクト編集機能を実装できた
- [ ] プロジェクト削除機能を実装できた
- [ ] 確認ダイアログを追加できた

## 🔗 次回予告

Day 12では、プロジェクトにメンバーを追加する機能を実装します。

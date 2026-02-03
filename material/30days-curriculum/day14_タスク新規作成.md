# Day 14: タスク新規作成を実装しよう

## 🎯 今日のゴール

新しいタスクを作成できるフォーム画面を実装します。タイトル、説明、優先度、期限、担当者を設定できるようにします。

【スクリーンショット: タスク作成フォーム】

## 🤔 なぜこれを作るのか?

タスク管理の出発点となる機能です。**タスク作成は料理のレシピを書くようなもの**。何を作るか（タイトル）、どう作るか（説明）、いつまでに（期限）、誰が作るか（担当者）を明確にすることで、作業がスムーズに進みます。

## 📊 実装ステップ一覧

| ステップ | 作業内容 | 所要時間 |
|---------|---------|---------|
| Step 1 | 作成ページを作成 | 10分 |
| Step 2 | フォーム実装 | 20分 |
| Step 3 | tRPC mutationで保存 | 15分 |
| Step 4 | 担当者選択 | 15分 |

**合計時間**: 約60分

---

### Step 1: 作成ページを作成（10分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
'use client';

import { useParams } from 'next/navigation';

export default function NewTaskPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">新規タスク作成</h1>
    </div>
  );
}
```

✅ **確認ポイント**: /projects/[id]/tasks/newにアクセスできる

【スクリーンショット: 確認画面】

---

### Step 2: フォーム実装（20分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@/component/ui/input';
import { Button } from '@/component/ui/button';
import { Label } from '@/component/ui/label';
import { Textarea } from '@/component/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';

export default function NewTaskPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ title, description, priority, dueDate });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">新規タスク作成</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">タイトル *</Label>
          <Input
            id="title"
            required
            className="w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
        <div className="space-y-2">
          <Label>優先度</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="優先度を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">低</SelectItem>
              <SelectItem value="MEDIUM">中</SelectItem>
              <SelectItem value="HIGH">高</SelectItem>
              <SelectItem value="URGENT">緊急</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">期限</Label>
          <Input
            id="dueDate"
            type="date"
            className="w-full"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">作成</Button>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: フォームが表示され、入力できる

【スクリーンショット: 確認画面】

---

### Step 3: tRPC mutationで保存（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx（API連携部分）
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

export default function NewTaskPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const createMutation = api.task.create.useMutation({
    onSuccess: () => {
      router.push(`/projects/${projectId}/tasks`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      projectId,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* フォーム内容は同じ */}
      <Button
        type="submit"
        className="w-full"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? '作成中...' : '作成'}
      </Button>
    </div>
  );
}
```

✅ **確認ポイント**: タスクが作成され、一覧ページに戻る

【スクリーンショット: 確認画面】

---

### Step 4: 担当者選択（15分）

💻 **実装**:

```typescript
// filepath: src/app/projects/[id]/tasks/new/page.tsx（担当者選択部分）
export default function NewTaskPage() {
  const [assigneeId, setAssigneeId] = useState('');

  const { data: members } = api.project.getMembers.useQuery({ projectId });

  return (
    <div className="max-w-xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 他のフィールド */}

        <div className="space-y-2">
          <Label>担当者</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="担当者を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未割当</SelectItem>
              {members?.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full">作成</Button>
      </form>
    </div>
  );
}
```

✅ **確認ポイント**: プロジェクトメンバーから担当者を選択できる

【スクリーンショット: 確認画面】

---

## 📝 学んだこと

- **Select コンポーネント**: shadcn/uiのドロップダウンリストの実装
- **date型input**: HTML5のdate inputで日付選択
- **disabled属性**: 送信中のボタンを無効化してダブルクリック防止
- **リレーション取得**: tRPCでプロジェクトメンバーを取得

## 📋 今日のまとめ

- [ ] タスク作成ページを作成できた
- [ ] フォームを実装できた
- [ ] tRPC mutationでデータを保存できた
- [ ] 担当者を選択できるようにした

## ⚠️ つまずきポイント

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 日付が送信されない | dueDate が空文字列のまま | 空の場合は undefined に変換 |
| 担当者が表示されない | members が undefined | オプショナルチェーン `members?.map()` を使用 |
| 作成後に画面が変わらない | onSuccess が動作していない | router.push() の引数を確認 |

## 🔗 次回予告

Day 15では、タスクの編集・削除機能を実装します。
